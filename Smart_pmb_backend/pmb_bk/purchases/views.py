# API views for the purchases app: an Authorized Purchaser's own dashboard/
# rice requests, and the PMB officer-facing rice request review queue.
# Mirrors the shape of mills/views.py (MillOwnerDashboardView / IsMillOwner /
# OfficerLicenseViewSet.approve/reject) for the authorized-purchaser actor.
from django.db import transaction
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasAnyPermission, HasPermission
from farmers.models import TransactionLog, Warehouse
from farmers.serializers import TransactionVerificationSerializer, TransactionVerificationWriteSerializer
from farmers.views import _log_transaction
from sysops.utils import log_audit, raise_low_stock_alert

from .models import AuthorizedPurchaser, PurchaserStock, RiceRequest
from .permissions import IsAuthorizedPurchaser
from .serializers import (
    AuthorizedPurchaserSerializer,
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

        return Response(
            {
                "authorized_purchaser": AuthorizedPurchaserSerializer(profile).data if profile else None,
                "kpis": {
                    "total_stock_kg": total_stock_kg,
                    "stock_types_count": stock.count(),
                    "pending_requests_count": pending_requests_count,
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
            warehouse.refresh_from_db(fields=["current_stock"])

        raise_low_stock_alert(warehouse, warehouse.current_stock)

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
