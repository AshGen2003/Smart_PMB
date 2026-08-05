# API views for the purchases app: an Authorized Purchaser's own dashboard/
# rice requests, and the PMB officer-facing rice request review queue.
# Mirrors the shape of mills/views.py (MillOwnerDashboardView / IsMillOwner /
# OfficerLicenseViewSet.approve/reject) for the authorized-purchaser actor.
import secrets

from django.db import transaction
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasAnyPermission, HasPermission
from farmers.models import Farmer, TransactionLog, Warehouse, season_date_range
from farmers.serializers import TransactionVerificationSerializer, TransactionVerificationWriteSerializer
from farmers.views import _current_season_channel_totals_kg, _log_transaction
from sysops.utils import get_config_value, log_audit

from .models import AuthorizedPurchaser, DispatchManifest, FarmGatePurchase, PurchaserStock, RiceRequest
from .permissions import IsAuthorizedPurchaser
from .serializers import (
    AuthorizedPurchaserSerializer,
    DispatchManifestCreateSerializer,
    DispatchManifestSerializer,
    FarmerNicLookupSerializer,
    FarmGatePurchaseCreateSerializer,
    FarmGatePurchaseSerializer,
    OfficerAuthorizedPurchaserWriteSerializer,
    OfficerDispatchManifestSerializer,
    OfficerFarmGatePurchaseSerializer,
    OfficerRiceRequestSerializer,
    PurchaserStockSerializer,
    RiceRequestSerializer,
    RiceRequestWriteSerializer,
)


class PurchaserDashboardView(APIView):
    """Aggregates a logged-in Authorized Purchaser's own profile, stock-on-hand, and recent rice requests."""

    permission_classes = [IsAuthorizedPurchaser]

    def get(self, request):
        stock = PurchaserStock.objects.filter(purchaser=request.user).select_related("paddy_type")
        total_stock_kg = stock.aggregate(total=Sum("quantity_kg"))["total"] or 0
        pending_requests_count = RiceRequest.objects.filter(
            purchaser=request.user, status=RiceRequest.Status.PENDING
        ).count()
        recent_requests = RiceRequest.objects.filter(purchaser=request.user).select_related(
            "paddy_type"
        )[:6]
        profile = AuthorizedPurchaser.objects.select_related("district").filter(user=request.user).first()

        season_start, season_end = season_date_range(timezone.now().date())
        rice_request_kg = RiceRequest.objects.filter(
            purchaser=request.user, status=RiceRequest.Status.FULFILLED,
            requested_date__date__range=(season_start, season_end),
        ).aggregate(total=Sum("quantity_kg"))["total"] or 0
        farm_gate_kg = FarmGatePurchase.objects.filter(
            purchaser=request.user, purchase_date__range=(season_start, season_end),
        ).aggregate(total=Sum("weight_kg"))["total"] or 0
        weight_used_kg = rice_request_kg + farm_gate_kg
        weight_limit_kg = profile.weight_limit_kg if profile else None

        return Response(
            {
                "authorized_purchaser": AuthorizedPurchaserSerializer(profile).data if profile else None,
                "kpis": {
                    "total_stock_kg": total_stock_kg,
                    "stock_types_count": stock.count(),
                    "pending_requests_count": pending_requests_count,
                },
                "limits": {
                    "weight_limit_kg": weight_limit_kg,
                    "weight_used_kg": weight_used_kg,
                    "weight_remaining_kg": (
                        max(float(weight_limit_kg) - float(weight_used_kg), 0)
                        if weight_limit_kg is not None else None
                    ),
                    "advance_amount": profile.advance_amount if profile else None,
                },
                "stock_by_type": PurchaserStockSerializer(stock, many=True).data,
                "recent_requests": RiceRequestSerializer(recent_requests, many=True).data,
            }
        )


class RiceRequestViewSet(viewsets.ModelViewSet):
    """
    Self-service CRUD for a purchaser's own rice requests: list/view their
    history, submit a new request, and withdraw one while it's still
    pending (no update -- approval/fulfillment fields are officer-only, set
    via OfficerRiceRequestViewSet).
    """

    permission_classes = [IsAuthorizedPurchaser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return RiceRequest.objects.filter(purchaser=self.request.user).select_related("paddy_type")

    def get_serializer_class(self):
        if self.action == "create":
            return RiceRequestWriteSerializer
        return RiceRequestSerializer

    def perform_create(self, serializer):
        serializer.save(purchaser=self.request.user)

    def destroy(self, request, *args, **kwargs):
        rice_request = self.get_object()
        if rice_request.status != RiceRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending requests can be withdrawn."}, status=400
            )
        return super().destroy(request, *args, **kwargs)


class OfficerRiceRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    PMB officer review queue for Authorized Purchasers' rice requests: list/
    view all requests, plus the approve/reject/fulfill workflow actions.
    Viewing requires either "monitor_operations" or "record_purchases"; the
    approve/reject/fulfill actions require "record_purchases" specifically
    -- the same codename that already gates recording purchases from
    farmers (OfficerHarvestViewSet in farmers/views.py).
    """

    queryset = RiceRequest.objects.select_related(
        "purchaser", "paddy_type", "reviewed_by", "fulfilled_from_warehouse"
    ).order_by("-requested_date")
    serializer_class = OfficerRiceRequestSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "record_purchases")]
        return [HasPermission("record_purchases")]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Moves a pending request to "approved", ready to be fulfilled from a warehouse."""
        rice_request = self.get_object()
        if rice_request.status != RiceRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending requests can be approved."}, status=400
            )
        rice_request.status = RiceRequest.Status.APPROVED
        rice_request.reviewed_by = request.user
        rice_request.save(update_fields=["status", "reviewed_by"])
        log_audit(request.user, "approve_rice_request", "purchases", f"RiceRequest #{rice_request.id}")
        return Response(OfficerRiceRequestSerializer(rice_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Moves a pending request straight to "rejected" (a terminal state)."""
        rice_request = self.get_object()
        if rice_request.status != RiceRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending requests can be rejected."}, status=400
            )
        rice_request.status = RiceRequest.Status.REJECTED
        rice_request.review_notes = request.data.get("review_notes", "")
        rice_request.reviewed_by = request.user
        rice_request.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "reject_rice_request", "purchases", f"RiceRequest #{rice_request.id}")
        return Response(OfficerRiceRequestSerializer(rice_request).data)

    @action(detail=True, methods=["post"])
    def fulfill(self, request, pk=None):
        """
        Confirms release of an approved request's quantity from a chosen
        warehouse: deducts it from that warehouse's current stock and adds
        it onto the purchaser's personal stock ledger. Uses F() expressions
        throughout so two fulfillments hitting the same row can't race.
        """
        rice_request = self.get_object()
        if rice_request.status != RiceRequest.Status.APPROVED:
            return Response(
                {"detail": "Only approved requests can be fulfilled."}, status=400
            )

        warehouse_id = request.data.get("warehouse")
        warehouse = get_object_or_404(Warehouse, pk=warehouse_id)
        if warehouse.current_stock < rice_request.quantity_kg:
            return Response(
                {"detail": "Selected warehouse does not have enough stock for this request."},
                status=400,
            )

        with transaction.atomic():
            Warehouse.objects.filter(pk=warehouse.pk).update(
                current_stock=F("current_stock") - rice_request.quantity_kg
            )
            stock, _ = PurchaserStock.objects.get_or_create(
                purchaser=rice_request.purchaser, paddy_type=rice_request.paddy_type
            )
            PurchaserStock.objects.filter(pk=stock.pk).update(
                quantity_kg=F("quantity_kg") + rice_request.quantity_kg
            )
            _log_transaction(
                warehouse,
                TransactionLog.TransactionType.RICE_REQUEST_FULFILLMENT,
                -rice_request.quantity_kg,
                paddy_type=rice_request.paddy_type,
                rice_request=rice_request,
                updated_by=request.user,
            )

            rice_request.status = RiceRequest.Status.FULFILLED
            rice_request.fulfilled_from_warehouse = warehouse
            rice_request.reviewed_by = request.user
            rice_request.save(update_fields=["status", "fulfilled_from_warehouse", "reviewed_by"])

        log_audit(request.user, "fulfill_rice_request", "purchases", f"RiceRequest #{rice_request.id}")
        return Response(OfficerRiceRequestSerializer(rice_request).data)

    @action(detail=True, methods=["post"])
    def verify_transaction(self, request, pk=None):
        """
        Records an after-the-fact accountability sign-off on a fulfilled
        rice request — an additional check, not a new gate (see
        farmers.models.TransactionVerification's docstring). Mirrors
        OfficerHarvestViewSet.verify_transaction in farmers/views.py.
        """
        rice_request = self.get_object()
        if rice_request.status != RiceRequest.Status.FULFILLED:
            return Response(
                {"detail": "Only fulfilled requests can be verified."}, status=400
            )
        serializer = TransactionVerificationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = serializer.save(rice_request=rice_request, verified_by=request.user)
        log_audit(request.user, "verify_transaction", "purchases", f"RiceRequest #{rice_request.id}")
        return Response(TransactionVerificationSerializer(verification).data, status=201)


class OfficerAuthorizedPurchaserViewSet(viewsets.ModelViewSet):
    """
    Officer-only management of an Authorized Purchaser's buying weight
    limit and government advance. List/retrieve give the officer context
    on every registered purchaser; the only write path is a partial update
    of the two officer-settable fields. Reuses "record_purchases" — the
    same codename already gating the rest of the purchaser-domain officer
    actions in this app.
    """

    queryset = AuthorizedPurchaser.objects.select_related("user", "district").order_by("organization")
    permission_classes = [HasPermission("record_purchases")]
    http_method_names = ["get", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return OfficerAuthorizedPurchaserWriteSerializer
        return AuthorizedPurchaserSerializer

    def perform_update(self, serializer):
        purchaser = serializer.save()
        log_audit(
            self.request.user, "update_purchaser_limits", "purchases",
            f"{purchaser.organization}: limit={purchaser.weight_limit_kg}kg, advance={purchaser.advance_amount}",
        )


class FarmerNicLookupView(APIView):
    """
    GET ?nic=<value> — narrow, purchaser-scoped, exact-match farmer lookup
    for the farm-gate buying terminal. Deliberately not FarmerListView
    (farmers/views.py) -- that's officer-only, unfiltered, and doesn't
    expose quota. Returns the minimal fields a purchaser needs to decide
    whether to buy: identity, reliability, and remaining seasonal quota.
    """

    permission_classes = [IsAuthorizedPurchaser]

    def get(self, request):
        nic = request.query_params.get("nic", "").strip()
        if not nic:
            return Response({"detail": "nic query param is required."}, status=400)
        farmer = Farmer.objects.filter(nic__iexact=nic).first()
        if not farmer:
            return Response({"detail": "No farmer found with that NIC."}, status=404)

        quota_kg_per_acre = get_config_value("quota_kg_per_acre")
        max_quota_kg = float(farmer.land_size) * quota_kg_per_acre if farmer.land_size is not None else None
        quota_used_kg = float(_current_season_channel_totals_kg(farmer))
        quota = {
            "max_quota_kg": max_quota_kg,
            "quota_used_kg": quota_used_kg,
            "quota_remaining_kg": (
                max(max_quota_kg - quota_used_kg, 0) if max_quota_kg is not None else None
            ),
        }
        return Response(FarmerNicLookupSerializer(farmer, context={"quota": quota}).data)


class FarmGatePurchaseViewSet(viewsets.ModelViewSet):
    """
    Self-service create/list for a purchaser's own farm-gate purchases --
    a recorded purchase is final, like mills.MillingReportViewSet, since
    the guaranteed price is already fixed and there's no officer approval
    step in this workflow. perform_create enforces two hard blocks: the
    purchaser's own remaining seasonal weight_limit_kg, and the farmer's
    own remaining seasonal quota.
    """

    permission_classes = [IsAuthorizedPurchaser]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return FarmGatePurchase.objects.filter(purchaser=self.request.user).select_related("farmer", "paddy_type")

    def get_serializer_class(self):
        if self.action == "create":
            return FarmGatePurchaseCreateSerializer
        return FarmGatePurchaseSerializer

    def perform_create(self, serializer):
        farmer = serializer.validated_data["farmer"]
        paddy_type = serializer.validated_data["paddy_type"]
        weight_kg = serializer.validated_data["weight_kg"]

        season_start, season_end = season_date_range(timezone.now().date())
        profile = AuthorizedPurchaser.objects.filter(user=self.request.user).first()
        if profile and profile.weight_limit_kg is not None:
            rice_request_kg = RiceRequest.objects.filter(
                purchaser=self.request.user, status=RiceRequest.Status.FULFILLED,
                requested_date__date__range=(season_start, season_end),
            ).aggregate(total=Sum("quantity_kg"))["total"] or 0
            farm_gate_kg = FarmGatePurchase.objects.filter(
                purchaser=self.request.user, purchase_date__range=(season_start, season_end),
            ).aggregate(total=Sum("weight_kg"))["total"] or 0
            if rice_request_kg + farm_gate_kg + weight_kg > profile.weight_limit_kg:
                raise serializers.ValidationError(
                    {"detail": "This purchase would exceed your remaining seasonal buying limit."}
                )

        quota_kg_per_acre = get_config_value("quota_kg_per_acre")
        if farmer.land_size is not None:
            max_quota_kg = float(farmer.land_size) * quota_kg_per_acre
            quota_used_kg = float(_current_season_channel_totals_kg(farmer))
            if quota_used_kg + float(weight_kg) > max_quota_kg:
                raise serializers.ValidationError(
                    {"detail": "This purchase would exceed the farmer's remaining seasonal quota."}
                )

        unit_price = paddy_type.guaranteed_price
        total_amount = weight_kg * unit_price
        receipt_no = f"FGP-{timezone.now():%Y%m%d}-{secrets.token_hex(3).upper()}"
        purchase = serializer.save(
            purchaser=self.request.user, unit_price=unit_price,
            total_amount=total_amount, receipt_no=receipt_no,
        )
        log_audit(
            self.request.user, "record_farm_gate_purchase", "purchases",
            f"{farmer.name}: {weight_kg}kg @ Rs.{unit_price}",
        )
        return purchase


class OfficerFarmGatePurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only officer-side audit visibility into all farm-gate purchases -- no approval step needed here, so no write actions."""

    queryset = FarmGatePurchase.objects.select_related("purchaser", "farmer", "paddy_type").order_by(
        "-purchase_date", "-id"
    )
    serializer_class = OfficerFarmGatePurchaseSerializer
    permission_classes = [HasAnyPermission("monitor_operations", "record_purchases")]


class DispatchManifestViewSet(viewsets.ModelViewSet):
    """
    Self-service create/list/withdraw for a purchaser's own dispatch
    manifests, aggregating their own unassigned FarmGatePurchase rows for
    transfer to a destination warehouse.
    """

    permission_classes = [IsAuthorizedPurchaser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return DispatchManifest.objects.filter(purchaser=self.request.user).prefetch_related("purchases")

    def get_serializer_class(self):
        if self.action == "create":
            return DispatchManifestCreateSerializer
        return DispatchManifestSerializer

    def perform_create(self, serializer):
        purchase_ids = serializer.validated_data.pop("purchase_ids", [])
        manifest = serializer.save(purchaser=self.request.user)
        if purchase_ids:
            FarmGatePurchase.objects.filter(
                pk__in=purchase_ids, purchaser=self.request.user, manifest__isnull=True
            ).update(manifest=manifest)
        return manifest

    def destroy(self, request, *args, **kwargs):
        manifest = self.get_object()
        if manifest.status != DispatchManifest.Status.PENDING:
            return Response({"detail": "Only a pending manifest can be withdrawn."}, status=400)
        return super().destroy(request, *args, **kwargs)


class OfficerDispatchManifestViewSet(viewsets.ReadOnlyModelViewSet):
    """PMB officer review queue for purchasers' dispatch manifests. Approval doesn't create the Delivery -- an officer does that separately via the Transportation page."""

    queryset = DispatchManifest.objects.select_related("purchaser", "destination_warehouse", "reviewed_by").prefetch_related(
        "purchases"
    ).order_by("-requested_date")
    serializer_class = OfficerDispatchManifestSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "record_purchases")]
        return [HasPermission("record_purchases")]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        manifest = self.get_object()
        if manifest.status != DispatchManifest.Status.PENDING:
            return Response({"detail": "Only pending manifests can be approved."}, status=400)
        manifest.status = DispatchManifest.Status.APPROVED
        manifest.reviewed_by = request.user
        manifest.save(update_fields=["status", "reviewed_by"])
        log_audit(request.user, "approve_dispatch_manifest", "purchases", f"DispatchManifest #{manifest.id}")
        return Response(self.get_serializer(manifest).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        manifest = self.get_object()
        if manifest.status != DispatchManifest.Status.PENDING:
            return Response({"detail": "Only pending manifests can be rejected."}, status=400)
        manifest.status = DispatchManifest.Status.REJECTED
        manifest.review_notes = request.data.get("review_notes", "")
        manifest.reviewed_by = request.user
        manifest.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "reject_dispatch_manifest", "purchases", f"DispatchManifest #{manifest.id}")
        return Response(self.get_serializer(manifest).data)
