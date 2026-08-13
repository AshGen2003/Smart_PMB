# API views for the farmers app: public district lookup, a farmer's own
# dashboard/notifications, and the PMB officer/admin-facing management of
# warehouses, paddy types, and the harvest approval workflow (the core
# business logic of the whole system lives in OfficerHarvestViewSet below).
import io
import logging
import secrets
from datetime import datetime, timedelta

import qrcode
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncWeek
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.emails import send_temp_password_email
from accounts.models import Message, Role, User
from accounts.permissions import HasAnyPermission, HasPermission
from accounts.serializers import generate_temp_password
from accounts.sms import send_sms
from sysops.models import SystemAlert
from sysops.serializers import SystemAlertSerializer
from sysops.utils import WAREHOUSE_ALERT_TYPE_PREFIXES, get_config_value, log_audit, raise_low_stock_alert

from .pdf import build_officer_report_pdf
from .reports import build_officer_report_data
from .scoring import recalculate_reliability_score

from .models import (
    Delivery,
    DeliveryLocationPing,
    DeliverySlot,
    Farmer,
    FuelRecord,
    Harvest,
    Inventory,
    MaintenanceRecord,
    Notification,
    PaddyType,
    Payment,
    PriceRecord,
    Route,
    TransactionLog,
    Vehicle,
    Warehouse,
    WarehouseTransferRequest,
    season_date_range,
)
from .permissions import CanViewVehicles
from .serializers import (
    DeliveryLocationPingSerializer,
    DeliverySerializer,
    DeliverySlotCreateSerializer,
    DeliverySlotSerializer,
    DeliveryWriteSerializer,
    DistrictSerializer,
    FarmerBankDetailsSerializer,
    FarmerHarvestCreateSerializer,
    FarmerOptionSerializer,
    FuelRecordSerializer,
    HarvestSerializer,
    InventorySerializer,
    MaintenanceDecisionSerializer,
    MaintenanceRecordSerializer,
    NotificationSerializer,
    OfficerHarvestSerializer,
    OfficerHarvestWriteSerializer,
    OfficerPaymentSerializer,
    PaddyTypeSerializer,
    PaddyTypeWriteSerializer,
    PaymentSerializer,
    PriceRecordSerializer,
    RouteSerializer,
    TransactionLogSerializer,
    TransactionVerificationSerializer,
    TransactionVerificationWriteSerializer,
    VehicleSerializer,
    WarehouseManagerDeliverySlotSerializer,
    WarehouseManagerSelfUpdateSerializer,
    WarehouseManagerDeliverySlotSerializer,
    WarehouseSerializer,
    WarehouseStockAdjustmentSerializer,
    WarehouseTransferRequestSerializer,
    WarehouseTransferRequestWriteSerializer,
    WarehouseWriteSerializer,
)
from .models import District

logger = logging.getLogger(__name__)


STATUS_LABELS = {
    "pending": "Pending",
    "verified": "Verified",
    "collected": "Collected",
    "rejected": "Rejected",
}


def _status_breakdown(queryset):
    """Counts of a Harvest queryset grouped by status, in a fixed chart-friendly order (zero-filled for statuses with no rows)."""
    counts = {row["status"]: row["count"] for row in queryset.values("status").annotate(count=Count("id"))}
    return [
        {"status": status, "label": label, "count": counts.get(status, 0)}
        for status, label in STATUS_LABELS.items()
    ]


def _harvest_trend(queryset, weeks=12):
    """Total quantity_kg per week for the last `weeks` weeks, oldest first — the time series behind the harvest-volume line chart."""
    since = timezone.now().date() - timedelta(weeks=weeks)
    rows = (
        queryset.filter(harvest_date__gte=since)
        .annotate(week=TruncWeek("harvest_date"))
        .values("week")
        .annotate(quantity_kg=Sum("quantity_kg"))
        .order_by("week")
    )
    # Cast Decimal -> float: DRF's renderer serializes Decimal as a JSON
    # string (to preserve precision), but recharts needs actual JSON
    # numbers to compute chart scales/domains correctly.
    return [
        {"period": row["week"].strftime("%b %d"), "quantity_kg": float(row["quantity_kg"] or 0)}
        for row in rows
    ]


class DistrictListView(generics.ListAPIView):
    """Public list of districts (with province) used to populate the farmer registration form's dropdown."""

    queryset = District.objects.select_related("province").order_by("name")
    serializer_class = DistrictSerializer
    permission_classes = [AllowAny]


def _current_season_harvest_total_kg(farmer):
    """Sum of this farmer's confirmed (verified/collected) harvest quantity within the current season."""
    start, end = season_date_range(timezone.now().date())
    return farmer.harvests.filter(
        harvest_date__range=(start, end), status__in=["verified", "collected"]
    ).aggregate(total=Sum("quantity_kg"))["total"] or 0


def _current_season_channel_totals_kg(farmer):
    """
    Confirmed Harvest kg plus FarmGatePurchase kg for this farmer in the
    current season — the combined figure the seasonal quota is actually
    checked against, since a real farmer sells through multiple channels
    (the collection pipeline and direct farm-gate purchases) against one
    seasonal cap. Local import of purchases.models avoids a circular
    import at module load (purchases/views.py already imports from this
    module, farmers/views.py must not import back at the top level).
    """
    from purchases.models import FarmGatePurchase

    start, end = season_date_range(timezone.now().date())
    harvest_kg = _current_season_harvest_total_kg(farmer)
    farmgate_kg = FarmGatePurchase.objects.filter(
        farmer=farmer, purchase_date__range=(start, end)
    ).aggregate(total=Sum("weight_kg"))["total"] or 0
    return harvest_kg + farmgate_kg


class FarmerDashboardView(APIView):
    """Aggregates a logged-in farmer's own profile, recent harvests/payments/notifications, and KPI summary."""

    permission_classes = [HasPermission("access_farmer_portal")]

    def get(self, request):
        farmer = get_object_or_404(
            Farmer.objects.select_related("district", "province"), user=request.user
        )

        harvests = farmer.harvests.select_related("paddy_type")[:6]
        payments = farmer.payments.all()
        notifications = farmer.notifications.all()[:6]
        paddy_types = PaddyType.objects.filter(is_active=True)

        total_earnings = payments.filter(status="disbursed").aggregate(
            total=Sum("amount")
        )["total"] or 0
        pending_payments = payments.filter(status__in=["pending", "processing"]).count()

        current_season = season_for_date(timezone.now().date())
        quota_kg_per_acre = get_config_value("quota_kg_per_acre")
        max_quota_kg = float(farmer.land_size) * quota_kg_per_acre if farmer.land_size is not None else None
        quota_used_kg = float(_current_season_channel_totals_kg(farmer))

        return Response(
            {
                "farmer": {
                    "registration_no": farmer.registration_no,
                    "land_size": farmer.land_size,
                    "status": farmer.status,
                    "district": farmer.district.name if farmer.district else None,
                    "province": farmer.province.name if farmer.province else None,
                    "bank_account": farmer.bank_account,
                    "bank_name": farmer.bank_name,
                    "bank_branch": farmer.bank_branch,
                    "reliability_score": farmer.reliability_score,
                },
                "kpis": {
                    "total_harvests": farmer.harvests.count(),
                    "pending_payments": pending_payments,
                    "total_earnings": total_earnings,
                },
                "quota": {
                    "max_quota_kg": max_quota_kg,
                    "quota_used_kg": quota_used_kg,
                    "quota_remaining_kg": (
                        max(max_quota_kg - quota_used_kg, 0) if max_quota_kg is not None else None
                    ),
                    "season": current_season,
                },
                "current_season": current_season,
                "paddy_types": PaddyTypeSerializer(paddy_types, many=True).data,
                "harvests": HarvestSerializer(harvests, many=True).data,
                "payments": PaymentSerializer(payments.order_by("-id")[:10], many=True).data,
                "notifications": NotificationSerializer(notifications, many=True).data,
                "charts": {
                    "status_breakdown": _status_breakdown(farmer.harvests),
                    "harvest_trend": _harvest_trend(farmer.harvests),
                },
            }
        )


class FarmerBankDetailsView(APIView):
    """Lets the logged-in farmer view (GET) and edit (PATCH) their own payout bank details."""

    permission_classes = [HasPermission("access_farmer_portal")]

    def get(self, request):
        farmer = get_object_or_404(Farmer, user=request.user)
        return Response(FarmerBankDetailsSerializer(farmer).data)

    def patch(self, request):
        farmer = get_object_or_404(Farmer, user=request.user)
        serializer = FarmerBankDetailsSerializer(farmer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        farmer = serializer.save()
        log_audit(request.user, "update_bank_details", "farmers", farmer.name)
        return Response(FarmerBankDetailsSerializer(farmer).data)


class NotificationMarkReadView(APIView):
    """Marks one of the logged-in farmer's own notifications as read."""

    permission_classes = [HasPermission("access_farmer_portal")]

    def post(self, request, pk):
        # farmer__user=request.user scopes the lookup so a farmer can only
        # mark their own notifications, never someone else's by guessing
        # the pk.
        notification = get_object_or_404(
            Notification, pk=pk, farmer__user=request.user
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FarmerHarvestViewSet(viewsets.ModelViewSet):
    """
    Self-service CRUD for a farmer's own Harvest submissions: list/view
    their history, submit a new delivery, and withdraw one while it's
    still pending. No update endpoint — a farmer can't edit a submission
    after the fact, only withdraw and resubmit; officer-only assessment
    fields (grade/price/etc.) are exclusively set via OfficerHarvestViewSet.
    """

    permission_classes = [HasPermission("access_farmer_portal")]
    http_method_names = ["get", "post", "delete", "head", "options"]
    serializer_class = HarvestSerializer

    def get_queryset(self):
        return Harvest.objects.filter(farmer__user=self.request.user).select_related(
            "paddy_type"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return FarmerHarvestCreateSerializer
        return HarvestSerializer

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user.farmer_profile)

    def destroy(self, request, *args, **kwargs):
        harvest = self.get_object()
        if harvest.status != Harvest.Status.PENDING:
            return Response(
                {"detail": "Only pending harvests can be withdrawn."}, status=400
            )
        return super().destroy(request, *args, **kwargs)


class FarmerDeliverySlotViewSet(viewsets.ModelViewSet):
    """
    Self-service CRUD for a farmer's own DeliverySlot bookings: list/view
    their history, book a new slot, and cancel one while it's still
    booked. Mirrors FarmerHarvestViewSet's shape.
    """

    permission_classes = [HasPermission("access_farmer_portal")]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return DeliverySlot.objects.filter(farmer__user=self.request.user).select_related(
            "warehouse", "paddy_type"
        )

    def get_serializer_class(self):
        if self.action == "create":
            return DeliverySlotCreateSerializer
        return DeliverySlotSerializer

    def perform_create(self, serializer):
        booking_reference = f"BK-{timezone.now():%Y%m%d}-{secrets.token_hex(3).upper()}"
        serializer.save(farmer=self.request.user.farmer_profile, booking_reference=booking_reference)

    def destroy(self, request, *args, **kwargs):
        slot = self.get_object()
        if slot.status != DeliverySlot.Status.BOOKED:
            return Response({"detail": "Only a booked slot can be cancelled."}, status=400)
        slot.status = DeliverySlot.Status.CANCELLED
        slot.save(update_fields=["status"])
        return Response(status=204)


class DeliverySlotQrView(APIView):
    """
    Generates a QR PNG (on the fly, never stored) encoding the booking's
    check-in URL — unlike PublicHarvestTraceQrView, this is NOT AllowAny:
    only the booking's own farmer or the warehouse's assigned manager can
    fetch it. Meant to be served via a Next.js Route Handler proxy on the
    frontend (reading the httpOnly auth cookie server-side and forwarding
    it), not a direct <img> straight to this origin — a plain <img> tag
    can't attach the frontend's auth cookie to a cross-origin Django request.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, booking_reference):
        slot = get_object_or_404(DeliverySlot, booking_reference=booking_reference)
        is_own_farmer = (
            getattr(request.user, "farmer_profile", None) and slot.farmer_id == request.user.farmer_profile.id
        )
        is_warehouse_manager = slot.warehouse.managed_by_id == request.user.id
        if not (is_own_farmer or is_warehouse_manager):
            return Response(status=403)

        img = qrcode.make(f"{settings.FRONTEND_URL}/warehouse-manager/delivery-slots?ref={booking_reference}")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return HttpResponse(buffer.getvalue(), content_type="image/png")


class FarmerListView(generics.ListAPIView):
    """List of all farmers (name + registration number) for the officer UI's farmer picker when recording a purchase."""

    permission_classes = [HasPermission("record_purchases")]
    queryset = Farmer.objects.all().order_by("name")
    serializer_class = FarmerOptionSerializer


class WarehouseOptionsView(generics.ListAPIView):
    """
    GET /api/warehouses/options/ — lightweight id/name list of active
    warehouses, for self-service pickers where a mill owner or authorized
    purchaser needs to choose a destination warehouse (e.g. a milling
    return request or dispatch manifest) but doesn't have the
    "manage_warehouses" permission WarehouseViewSet requires.
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Warehouse.objects.filter(status=Warehouse.Status.ACTIVE).order_by("name")

    def list(self, request, *args, **kwargs):
        return Response([{"id": w.id, "name": w.name} for w in self.get_queryset()])


class WarehouseViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD over Warehouse records. Requires "manage_warehouses" for
    every action, including list/retrieve — Portal Preview never calls this
    endpoint (it renders fake sample data client-side instead, see the
    frontend's previewSampleData.ts), so no permission needs loosening here
    just to support it.
    """

    permission_classes = [HasPermission("manage_warehouses")]
    queryset = Warehouse.objects.select_related("district", "province").order_by("name")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return WarehouseWriteSerializer
        return WarehouseSerializer

    def _sync_province(self, instance):
        # `province` is derived from `district` rather than set directly
        # by the client, so it can't drift out of sync with the chosen
        # district (see WarehouseWriteSerializer's note on excluding it).
        instance.province_id = instance.district.province_id if instance.district_id else None
        instance.save(update_fields=["province"])

    def perform_create(self, serializer):
        warehouse = serializer.save()
        self._sync_province(warehouse)
        log_audit(self.request.user, "create_warehouse", "farmers", warehouse.name)

    def perform_update(self, serializer):
        warehouse = serializer.save()
        self._sync_province(warehouse)
        log_audit(self.request.user, "update_warehouse", "farmers", warehouse.name)

    @action(detail=True, methods=["post"], url_path="adjust-stock")
    def adjust_stock(self, request, pk=None):
        """
        Manually adds or removes stock for one paddy type (+ optional
        grade) at this warehouse — one of two write paths onto
        Warehouse.current_stock/Inventory besides the automatic
        harvest-collection and rice-request-fulfillment flows (the other is
        WarehouseManagerAdjustStockView below, for the warehouse's own
        manager). Logged as a TransactionLog entry with
        reason="manual_adjustment", same shape as those two flows (see
        _log_transaction's docstring).
        """
        warehouse = self.get_object()
        payload = WarehouseStockAdjustmentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        error = _adjust_warehouse_stock(
            warehouse, payload.validated_data, request.user, "manual_stock_adjustment"
        )
        if error:
            return Response({"detail": error}, status=400)
        return Response(WarehouseSerializer(warehouse).data)

    @action(detail=False, methods=["get"], url_path="alerts")
    def alerts(self, request):
        """
        Every warehouse-capacity SystemAlert (reactive over-capacity,
        once-daily predictive, and low-stock) across every warehouse — the
        PMB officer's single place to see all of it, since
        SystemAlertViewSet's admin Alerts tab excludes every warehouse
        business/operational alert type to keep that tab system-health-only
        (see sysops/views.py and sysops/utils.py's
        WAREHOUSE_ALERT_TYPE_PREFIXES, the single shared source of truth
        both places filter against).
        """
        alert_filter = Q()
        for prefix in WAREHOUSE_ALERT_TYPE_PREFIXES:
            alert_filter |= Q(alert_type__startswith=prefix)
        alerts = (
            SystemAlert.objects.filter(alert_filter)
            .select_related("handled_by")
            .order_by("-created_at")
        )
        return Response(SystemAlertSerializer(alerts, many=True).data)

    @action(detail=False, methods=["post"], url_path=r"alerts/(?P<alert_id>\d+)/resolve")
    def resolve_alert(self, request, alert_id=None):
        """Resolves one warehouse-capacity alert, scoped to manage_warehouses (not manage_system) since this is warehouse triage, not general system administration."""
        alert = get_object_or_404(SystemAlert, pk=alert_id)
        if not alert.alert_type.startswith(WAREHOUSE_ALERT_TYPE_PREFIXES):
            return Response({"detail": "Not a warehouse capacity alert."}, status=400)
        alert.status = SystemAlert.Status.RESOLVED
        alert.handled_by = request.user
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["status", "handled_by", "resolved_at"])
        log_audit(request.user, "resolve_warehouse_capacity_alert", "farmers", alert.alert_type)
        return Response(status=204)

    @action(
        detail=True, methods=["post"], url_path="appoint-manager",
        permission_classes=[HasPermission("appoint_warehouse_managers")],
    )
    def appoint_manager(self, request, pk=None):
        """
        Assigns this warehouse's `managed_by` to a warehouse_manager
        account — either an existing one (pass `user_id`) or a brand new
        one (pass `email`/`full_name`, created the same way
        AdminUserWriteSerializer.create makes any other admin-created
        account: a generated temp password, must_change_password=True,
        emailed via send_temp_password_email). Enforces "one manager, one
        warehouse" by clearing `managed_by` on any other warehouse this
        user previously managed — the model's FK only enforces the
        opposite direction (one warehouse, one manager).
        """
        warehouse = self.get_object()
        manager_role = Role.objects.filter(slug="warehouse_manager").first()
        if not manager_role:
            return Response(
                {"detail": "The warehouse_manager role is not configured."}, status=500
            )

        user_id = request.data.get("user_id")
        if user_id:
            user = get_object_or_404(User, pk=user_id)
            if user.role_id != manager_role.id:
                return Response(
                    {"detail": "Selected user is not a warehouse manager."}, status=400
                )
        else:
            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            if not email or not full_name:
                return Response(
                    {"detail": "Email and full name are required to create a new manager."},
                    status=400,
                )
            if User.objects.filter(email__iexact=email).exists():
                return Response({"detail": "A user with this email already exists."}, status=400)

            temp_password = generate_temp_password()
            user = User(email=email, full_name=full_name, role=manager_role)
            user.set_password(temp_password)
            user.must_change_password = True
            user.save()
            send_temp_password_email(user, temp_password)

        with transaction.atomic():
            Warehouse.objects.filter(managed_by=user).exclude(pk=warehouse.pk).update(managed_by=None)
            warehouse.managed_by = user
            warehouse.save(update_fields=["managed_by"])

        log_audit(
            request.user, "appoint_warehouse_manager", "farmers",
            f"{warehouse.name} -> {user.email}",
        )
        return Response(WarehouseSerializer(warehouse).data)


class WarehouseManagerOptionsView(generics.ListAPIView):
    """GET /api/admin/warehouse-managers/ — lightweight list of PMB Officer and Warehouse Manager accounts, for the Warehouse form's "managed by" picker and the appoint-manager modal's "existing manager" dropdown."""

    permission_classes = [HasPermission("manage_warehouses")]

    def get_queryset(self):
        return User.objects.filter(role__slug__in=["pmb_officer", "warehouse_manager"]).order_by("full_name")

    def list(self, request, *args, **kwargs):
        return Response(
            [
                {"id": str(u.id), "name": u.full_name, "role": u.role.slug}
                for u in self.get_queryset()
            ]
        )


class WarehouseOptionsView(generics.ListAPIView):
    """
    GET /api/warehouses/options/ — lightweight id/name list of active
    warehouses, for self-service pickers where a mill owner or authorized
    purchaser needs to choose a destination warehouse (e.g. a milling
    return request or dispatch manifest) but doesn't have the
    "manage_warehouses" permission WarehouseViewSet requires.
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Warehouse.objects.filter(status=Warehouse.Status.ACTIVE).order_by("name")

    def list(self, request, *args, **kwargs):
        return Response([{"id": w.id, "name": w.name} for w in self.get_queryset()])


class WarehouseManagerDashboardView(APIView):
    """
    GET /api/warehouse-manager/dashboard/ — the single warehouse this
    logged-in warehouse_manager account manages (via Warehouse.managed_by),
    with its Inventory breakdown, recent TransactionLog entries, and any
    open capacity SystemAlerts for it. PATCH lets the manager update just
    their warehouse's `contact_number`/`status` (see
    WarehouseManagerSelfUpdateSerializer — everything structural stays
    officer/admin-only). Requires "access_warehouse_manager_portal" (not
    "manage_warehouses" — that's the officer/admin-side permission); data
    is additionally scoped by identity (only this user's own warehouse is
    ever returned/editable), same pattern as DriverDashboardView's
    `driver=request.user` filter.
    """

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def _get_own_warehouse(self, request):
        return Warehouse.objects.select_related("district", "province").filter(
            managed_by=request.user
        ).first()

    def _dashboard_payload(self, warehouse):
        inventory = Inventory.objects.filter(warehouse=warehouse).select_related(
            "paddy_type", "updated_by"
        )
        transactions = TransactionLog.objects.filter(warehouse=warehouse).order_by("-created_at")[:20]
        # alert_type encodes the warehouse id the same way
        # _raise_high_capacity_alert/raise_low_stock_alert/farmers.forecasting's
        # predictive version all do — resolving one of these three capacity
        # types for their own warehouse is self-served via
        # WarehouseManagerResolveAlertView below; anything else still stays
        # officer/admin-only (SystemAlertViewSet, "manage_system", or
        # WarehouseViewSet.resolve_alert for "manage_warehouses"), since
        # SystemAlert covers alert types well beyond warehouse capacity and
        # isn't scoped to be safely self-served in general.
        alerts = SystemAlert.objects.filter(
            alert_type__in=[
                f"high_capacity_warehouse_{warehouse.id}",
                f"predicted_capacity_warehouse_{warehouse.id}",
                f"low_stock_warehouse_{warehouse.id}",
            ],
            status=SystemAlert.Status.OPEN,
        ).order_by("-created_at")

        return {
            "warehouse": WarehouseSerializer(warehouse).data,
            "inventory": InventorySerializer(inventory, many=True).data,
            "transactions": TransactionLogSerializer(transactions, many=True).data,
            "alerts": SystemAlertSerializer(alerts, many=True).data,
        }

    def get(self, request):
        warehouse = self._get_own_warehouse(request)
        if not warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )
        return Response(self._dashboard_payload(warehouse))

    def patch(self, request):
        warehouse = self._get_own_warehouse(request)
        if not warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )

        serializer = WarehouseManagerSelfUpdateSerializer(
            warehouse, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit(request.user, "update_warehouse_info", "farmers", warehouse.name)
        return Response(self._dashboard_payload(warehouse))


class WarehouseManagerResolveAlertView(APIView):
    """
    POST /api/warehouse-manager/alerts/<pk>/resolve/ — lets a
    warehouse_manager clear a capacity SystemAlert (reactive, predictive, or
    low-stock) raised for the single warehouse they manage. Scoped two ways:
    by identity (Warehouse.managed_by=request.user, same as
    WarehouseManagerDashboardView) and by alert_type (must be one of this
    warehouse's own capacity alerts) — a manager can resolve their own
    warehouse's capacity warnings and nothing else, unlike the
    "manage_warehouses"-gated WarehouseViewSet.resolve_alert an officer uses
    for any warehouse, or the "manage_system"-gated SystemAlertViewSet.resolve
    admins use for every other alert type.
    """

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def post(self, request, pk=None):
        warehouse = Warehouse.objects.filter(managed_by=request.user).first()
        if not warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )

        alert = get_object_or_404(
            SystemAlert,
            pk=pk,
            alert_type__in=[
                f"high_capacity_warehouse_{warehouse.id}",
                f"predicted_capacity_warehouse_{warehouse.id}",
                f"low_stock_warehouse_{warehouse.id}",
            ],
        )
        alert.status = SystemAlert.Status.RESOLVED
        alert.handled_by = request.user
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["status", "handled_by", "resolved_at"])
        log_audit(request.user, "resolve_warehouse_capacity_alert", "farmers", alert.alert_type)
        return Response(status=204)


class WarehouseManagerAdjustStockView(APIView):
    """
    POST /api/warehouse-manager/adjust-stock/ — lets a warehouse_manager
    manually add/remove stock for the single warehouse they manage (via
    Warehouse.managed_by). Same underlying logic as
    WarehouseViewSet.adjust_stock (see _adjust_warehouse_stock above),
    scoped by identity rather than "manage_warehouses" — same access
    pattern as WarehouseManagerDashboardView.
    """

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def post(self, request):
        warehouse = Warehouse.objects.filter(managed_by=request.user).first()
        if not warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )

        payload = WarehouseStockAdjustmentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        error = _adjust_warehouse_stock(
            warehouse, payload.validated_data, request.user, "manager_stock_adjustment"
        )
        if error:
            return Response({"detail": error}, status=400)
        return Response(WarehouseSerializer(warehouse).data)


class WarehouseManagerTransactionsView(APIView):
    """
    GET /api/warehouse-manager/transactions/ — the full stock-movement
    history for the logged-in manager's own warehouse, unlike
    WarehouseManagerDashboardView's dashboard summary which caps at the 20
    most recent. Same identity-scoped access pattern as the other
    warehouse-manager views.
    """

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def get(self, request):
        warehouse = Warehouse.objects.filter(managed_by=request.user).first()
        if not warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )

        transactions = TransactionLog.objects.filter(warehouse=warehouse).order_by("-created_at")[:200]
        return Response(TransactionLogSerializer(transactions, many=True).data)


class WarehouseManagerTransferOptionsView(APIView):
    """
    GET /api/warehouse-manager/transfer-options/ — every other warehouse's
    basic info plus its Inventory breakdown, so a manager can see what's
    actually available before requesting a transfer into their own
    warehouse. Read-only; the requesting manager's own warehouse is
    excluded (see WarehouseManagerTransferRequestViewSet.perform_create's
    matching "not from your own warehouse" check).
    """

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def get(self, request):
        own_warehouse = Warehouse.objects.filter(managed_by=request.user).first()
        if not own_warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )
        warehouses = Warehouse.objects.exclude(pk=own_warehouse.pk).select_related("district")
        inventory = Inventory.objects.filter(
            warehouse__in=warehouses, quantity__gt=0
        ).select_related("warehouse", "paddy_type")

        return Response(
            {
                "warehouses": [
                    {
                        "id": w.id,
                        "name": w.name,
                        "district_name": w.district.name if w.district else None,
                    }
                    for w in warehouses
                ],
                "inventory": InventorySerializer(inventory, many=True).data,
            }
        )


class WarehouseManagerTransferRequestViewSet(viewsets.ModelViewSet):
    """
    Self-service transfer requests for a warehouse_manager: list their own
    outgoing requests and submit new ones. No update/delete — once
    submitted, only an officer can approve/reject it (see
    WarehouseTransferRequestViewSet below). `to_warehouse` is always the
    requesting manager's own warehouse, forced server-side in
    perform_create — never trusted from the client, so a manager can only
    ever request stock *into* the one warehouse they're assigned to (same
    "own appointed warehouse only" constraint every other manager-facing
    view in this file enforces).
    """

    permission_classes = [HasPermission("access_warehouse_manager_portal")]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return WarehouseTransferRequest.objects.filter(
            requested_by=self.request.user
        ).select_related("from_warehouse", "to_warehouse", "paddy_type", "reviewed_by")

    def get_serializer_class(self):
        if self.action == "create":
            return WarehouseTransferRequestWriteSerializer
        return WarehouseTransferRequestSerializer

    def perform_create(self, serializer):
        own_warehouse = Warehouse.objects.filter(managed_by=self.request.user).first()
        if not own_warehouse:
            raise ValidationError("You are not currently assigned to manage a warehouse.")

        from_warehouse = serializer.validated_data["from_warehouse"]
        if from_warehouse.pk == own_warehouse.pk:
            raise ValidationError("Cannot request a transfer from your own warehouse.")

        paddy_type = serializer.validated_data["paddy_type"]
        grade = serializer.validated_data.get("grade") or None
        quantity_kg = serializer.validated_data["quantity_kg"]
        inventory = Inventory.objects.filter(
            warehouse=from_warehouse, paddy_type=paddy_type, grade=grade
        ).first()
        available = inventory.quantity if inventory else 0
        if available < quantity_kg:
            raise ValidationError(
                f"Only {available} kg of this paddy type/grade is available at the selected warehouse."
            )

        serializer.save(to_warehouse=own_warehouse, requested_by=self.request.user)


class WarehouseManagerDeliverySlotLookupView(APIView):
    """GET ?ref=<booking_reference> — looks up a DeliverySlot booking, scoped to warehouses this manager actually manages."""

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def get(self, request):
        ref = request.query_params.get("ref", "").strip()
        if not ref:
            return Response({"detail": "ref query param is required."}, status=400)
        slot = DeliverySlot.objects.filter(
            booking_reference=ref, warehouse__managed_by=request.user
        ).select_related("farmer", "paddy_type").first()
        if not slot:
            return Response({"detail": "No booking found with that reference for your warehouse."}, status=404)
        return Response(WarehouseManagerDeliverySlotSerializer(slot).data)


class WarehouseManagerDeliverySlotCheckInView(APIView):
    """POST {"action": "arrived"|"completed"|"no_show"} — the warehouse manager updates a booking's status on physical arrival/departure/no-show."""

    permission_classes = [HasPermission("access_warehouse_manager_portal")]

    def post(self, request, pk):
        slot = get_object_or_404(DeliverySlot, pk=pk, warehouse__managed_by=request.user)
        action_name = request.data.get("action")
        transitions = {
            "arrived": DeliverySlot.Status.ARRIVED,
            "completed": DeliverySlot.Status.COMPLETED,
            "no_show": DeliverySlot.Status.NO_SHOW,
        }
        if action_name not in transitions:
            return Response({"detail": "action must be 'arrived', 'completed', or 'no_show'."}, status=400)

        slot.status = transitions[action_name]
        if action_name == "arrived":
            slot.checked_in_by = request.user
            slot.checked_in_at = timezone.now()
            slot.save(update_fields=["status", "checked_in_by", "checked_in_at"])
        else:
            slot.save(update_fields=["status"])
        return Response(WarehouseManagerDeliverySlotSerializer(slot).data)


class WarehouseTransferRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Officer-facing review queue for warehouse managers' transfer requests:
    list/view all, plus approve/reject. Unlike purchases.RiceRequest, both
    warehouses are already fixed at request time, so `approve` moves the
    stock in one atomic step rather than a separate "fulfill" action.
    """

    permission_classes = [HasPermission("manage_warehouses")]
    queryset = WarehouseTransferRequest.objects.select_related(
        "from_warehouse", "to_warehouse", "paddy_type", "requested_by", "reviewed_by"
    )
    serializer_class = WarehouseTransferRequestSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != WarehouseTransferRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending transfer requests can be approved."}, status=400
            )

        inventory = Inventory.objects.filter(
            warehouse=transfer.from_warehouse, paddy_type=transfer.paddy_type, grade=transfer.grade
        ).first()
        available = inventory.quantity if inventory else 0
        if available < transfer.quantity_kg or transfer.from_warehouse.current_stock < transfer.quantity_kg:
            return Response(
                {"detail": "The source warehouse no longer has enough stock for this transfer."},
                status=400,
            )

        with transaction.atomic():
            Warehouse.objects.filter(pk=transfer.from_warehouse.pk).update(
                current_stock=F("current_stock") - transfer.quantity_kg
            )
            Warehouse.objects.filter(pk=transfer.to_warehouse.pk).update(
                current_stock=F("current_stock") + transfer.quantity_kg
            )
            _log_transaction(
                transfer.from_warehouse,
                TransactionLog.TransactionType.TRANSFER_OUT,
                -transfer.quantity_kg,
                paddy_type=transfer.paddy_type,
                grade=transfer.grade,
                transfer_request=transfer,
                updated_by=request.user,
            )
            _log_transaction(
                transfer.to_warehouse,
                TransactionLog.TransactionType.TRANSFER_IN,
                transfer.quantity_kg,
                paddy_type=transfer.paddy_type,
                grade=transfer.grade,
                transfer_request=transfer,
                updated_by=request.user,
            )
            transfer.from_warehouse.refresh_from_db(fields=["current_stock"])
            transfer.to_warehouse.refresh_from_db(fields=["current_stock"])
            transfer.status = WarehouseTransferRequest.Status.APPROVED
            transfer.reviewed_by = request.user
            transfer.resolved_date = timezone.now()
            transfer.save(update_fields=["status", "reviewed_by", "resolved_date"])

        _raise_high_capacity_alert(transfer.to_warehouse, transfer.to_warehouse.current_stock)
        raise_low_stock_alert(transfer.from_warehouse, transfer.from_warehouse.current_stock)
        log_audit(
            request.user, "approve_warehouse_transfer", "farmers",
            f"WarehouseTransferRequest #{transfer.id}",
        )

        for manager, body in (
            (
                transfer.from_warehouse.managed_by,
                f"{transfer.quantity_kg}kg of {transfer.paddy_type.type_name} was transferred "
                f"out to {transfer.to_warehouse.name}.",
            ),
            (
                transfer.to_warehouse.managed_by,
                f"{transfer.quantity_kg}kg of {transfer.paddy_type.type_name} was transferred "
                f"in from {transfer.from_warehouse.name}.",
            ),
        ):
            if manager:
                Message.objects.create(sender=request.user, recipient=manager, body=body)

        return Response(WarehouseTransferRequestSerializer(transfer).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != WarehouseTransferRequest.Status.PENDING:
            return Response(
                {"detail": "Only pending transfer requests can be rejected."}, status=400
            )
        transfer.status = WarehouseTransferRequest.Status.REJECTED
        transfer.review_notes = request.data.get("review_notes", "")
        transfer.reviewed_by = request.user
        transfer.resolved_date = timezone.now()
        transfer.save(update_fields=["status", "review_notes", "reviewed_by", "resolved_date"])
        log_audit(
            request.user, "reject_warehouse_transfer", "farmers",
            f"WarehouseTransferRequest #{transfer.id}",
        )
        if transfer.requested_by:
            Message.objects.create(
                sender=request.user,
                recipient=transfer.requested_by,
                body=(
                    f"Your transfer request for {transfer.quantity_kg}kg of "
                    f"{transfer.paddy_type.type_name} was rejected."
                ),
            )
        return Response(WarehouseTransferRequestSerializer(transfer).data)


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only per-warehouse/paddy-type/grade stock breakdown — see Inventory's docstring in models.py."""

    permission_classes = [HasPermission("manage_warehouses")]
    queryset = Inventory.objects.select_related("warehouse", "paddy_type", "updated_by")
    serializer_class = InventorySerializer


class TransactionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only warehouse stock-movement audit trail — see TransactionLog's docstring in models.py."""

    permission_classes = [HasAnyPermission("monitor_operations", "manage_warehouses")]
    queryset = TransactionLog.objects.select_related("warehouse")
    serializer_class = TransactionLogSerializer


class PaddyTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD over PaddyType records. Any authenticated user can view the list
    (farmers need to see guaranteed prices), but creating/editing requires
    "manage_pricing".
    """

    queryset = PaddyType.objects.all().order_by("type_name")

    def get_permissions(self):
        # price_history is read-only historical data for prices that are
        # already visible in the plain list (farmers/purchasers need to see
        # price trends, not just the current guaranteed price).
        if self.action in ("list", "retrieve", "price_history"):
            return [IsAuthenticated()]
        return [HasPermission("manage_pricing")]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PaddyTypeWriteSerializer
        return PaddyTypeSerializer

    def perform_create(self, serializer):
        paddy_type = serializer.save()
        log_audit(
            self.request.user, "create_paddy_type", "farmers",
            f"{paddy_type.type_name} @ Rs.{paddy_type.guaranteed_price}",
        )
        # The very first guaranteed_price is itself a price point worth
        # keeping in the history, same as every later change below.
        PriceRecord.objects.create(
            paddy_type=paddy_type, guaranteed_price=paddy_type.guaranteed_price,
            season=season_for_date(timezone.now().date()),
        )

    def perform_update(self, serializer):
        previous_price = serializer.instance.guaranteed_price
        paddy_type = serializer.save()
        log_audit(
            self.request.user, "update_paddy_type", "farmers",
            f"{paddy_type.type_name} @ Rs.{paddy_type.guaranteed_price}",
        )
        if paddy_type.guaranteed_price != previous_price:
            PriceRecord.objects.create(
                paddy_type=paddy_type, guaranteed_price=paddy_type.guaranteed_price,
                season=season_for_date(timezone.now().date()),
            )
            _notify_price_change(paddy_type, previous_price)

    @action(detail=True, methods=["get"], url_path="price-history")
    def price_history(self, request, pk=None):
        """Historical guaranteed-price snapshots for this PaddyType, most recent first. Optional ?season=yala|maha filter."""
        paddy_type = self.get_object()
        records = paddy_type.price_records.order_by("-effective_date")
        season = request.query_params.get("season")
        if season:
            records = records.filter(season=season)
        return Response(PriceRecordSerializer(records[:50], many=True).data)


def _log_transaction(
    warehouse, transaction_type, quantity_change, paddy_type, grade=None,
    harvest=None, rice_request=None, transfer_request=None, updated_by=None, notes="",
):
    """
    Records a TransactionLog entry and updates the matching Inventory line
    (get_or_create'd on warehouse+paddy_type+grade, then adjusted by
    quantity_change via F()) — additive telemetry alongside
    Warehouse.current_stock, which stays the single source of truth for
    the aggregate number and is updated separately by the caller. Called
    from OfficerHarvestViewSet.mark_collected below (positive
    quantity_change), purchases.OfficerRiceRequestViewSet.fulfill (negative
    quantity_change), WarehouseViewSet.adjust_stock above (either sign, the
    only caller that passes `notes`), and
    WarehouseTransferRequestViewSet.approve (called twice, once per side).
    """
    TransactionLog.objects.create(
        warehouse=warehouse,
        transaction_type=transaction_type,
        quantity_change=quantity_change,
        harvest=harvest,
        rice_request=rice_request,
        transfer_request=transfer_request,
        notes=notes,
    )
    inventory, _ = Inventory.objects.get_or_create(
        warehouse=warehouse, paddy_type=paddy_type, grade=grade,
    )
    Inventory.objects.filter(pk=inventory.pk).update(
        quantity=F("quantity") + quantity_change, updated_by=updated_by
    )


def _handle_delivery_delivered(delivery, user):
    """
    When a Delivery carrying a linked purchaser/mill-owner request
    transitions to "delivered", adds the relevant quantity into the
    destination warehouse's stock and flips the linked request to
    "delivered" too — mirrors the existing harvest-collection stock-
    increment pattern. Called from DeliveryViewSet.update_status and
    DriverDeliveryStatusView.post. Local imports of purchases/mills models
    avoid a circular import (those apps' views.py already import from this
    module at load time).
    """
    if not delivery.warehouse_id:
        return

    if delivery.dispatch_manifest_id:
        from purchases.models import DispatchManifest

        manifest = delivery.dispatch_manifest
        paddy_type_ids = manifest.purchases.values_list("paddy_type", flat=True).distinct()
        for paddy_type in PaddyType.objects.filter(id__in=paddy_type_ids):
            qty = manifest.purchases.filter(paddy_type=paddy_type).aggregate(total=Sum("weight_kg"))["total"] or 0
            if not qty:
                continue
            Warehouse.objects.filter(pk=delivery.warehouse_id).update(current_stock=F("current_stock") + qty)
            _log_transaction(
                delivery.warehouse, TransactionLog.TransactionType.DISPATCH_MANIFEST_DELIVERY,
                qty, paddy_type=paddy_type, updated_by=user, notes=f"DispatchManifest #{manifest.id}",
            )
        manifest.status = DispatchManifest.Status.DELIVERED
        manifest.save(update_fields=["status"])

    elif delivery.milling_return_request_id:
        from mills.models import MillingReturnRequest

        req = delivery.milling_return_request
        Warehouse.objects.filter(pk=delivery.warehouse_id).update(current_stock=F("current_stock") + req.rice_kg)
        _log_transaction(
            delivery.warehouse, TransactionLog.TransactionType.MILLING_RETURN_DELIVERY,
            req.rice_kg, paddy_type=req.allocation.paddy_type, updated_by=user,
            notes=f"MillingReturnRequest #{req.id}",
        )
        req.status = MillingReturnRequest.Status.DELIVERED
        req.save(update_fields=["status"])

    delivery.warehouse.refresh_from_db(fields=["current_stock"])
    _raise_high_capacity_alert(delivery.warehouse, delivery.warehouse.current_stock)


def _notify_farmer(harvest, message):
    """Creates a Notification the farmer sees on their dashboard — so a status change doesn't only show up if they happen to check back. Skipped if the farmer has turned harvest-update notifications off in Settings. Also sends an SMS via Text.lk if the farmer has opted into notify_via_sms."""
    farmer = harvest.farmer
    if farmer.notify_harvest_updates:
        Notification.objects.create(farmer=farmer, message=message)
    if farmer.notify_via_sms and farmer.contact_number:
        send_sms(farmer.contact_number, message)


def _notify_price_change(paddy_type, previous_price):
    """
    Tells every farmer a PaddyType's guaranteed price just changed — reuses
    the same notify_harvest_updates/notify_via_sms preference toggles
    _notify_farmer uses above rather than adding a third Settings option,
    since this is the same "farmer notification preferences" concept.
    """
    direction = "increased" if paddy_type.guaranteed_price > previous_price else "decreased"
    message = (
        f"The guaranteed price for {paddy_type.type_name} has {direction} "
        f"from Rs. {previous_price} to Rs. {paddy_type.guaranteed_price}."
    )
    for farmer in Farmer.objects.all():
        if farmer.notify_harvest_updates:
            Notification.objects.create(farmer=farmer, message=message)
        if farmer.notify_via_sms and farmer.contact_number:
            send_sms(farmer.contact_number, message)


def _raise_high_capacity_alert(warehouse, new_stock):
    """
    Raises a SystemAlert once a warehouse crosses 90% of its capacity.
    `alert_type` encodes the warehouse id so this only fires once per
    warehouse while an alert is still open — resolving/acknowledging it
    lets a future collection raise a fresh one if the condition persists.
    """
    if not warehouse.capacity or new_stock / warehouse.capacity < 0.9:
        return
    alert_type = f"high_capacity_warehouse_{warehouse.id}"
    already_open = SystemAlert.objects.filter(
        alert_type=alert_type, status=SystemAlert.Status.OPEN
    ).exists()
    if already_open:
        return
    SystemAlert.objects.create(
        alert_type=alert_type,
        level=SystemAlert.Level.WARNING,
        message=(
            f"{warehouse.name} is at {new_stock:.0f}/{warehouse.capacity:.0f} kg "
            f"({new_stock / warehouse.capacity:.0%} capacity) — consider arranging "
            "transport or offload."
        ),
    )


def _adjust_warehouse_stock(warehouse, data, user, log_action):
    """
    Applies a validated WarehouseStockAdjustmentSerializer payload to a
    warehouse's stock: computes the signed quantity, blocks removing more
    than what's actually on hand, atomically updates
    Warehouse.current_stock, writes a TransactionLog entry, raises a
    capacity alert on add, and audit-logs under `log_action` (kept distinct
    per caller — WarehouseViewSet.adjust_stock for officer/admin vs.
    WarehouseManagerAdjustStockView for the warehouse's own manager — so
    the audit trail shows who actually acted). Returns an error message
    string if validation fails (caller turns that into a 400), or None on
    success.
    """
    quantity = data["quantity"] if data["direction"] == "add" else -data["quantity"]
    paddy_type = data["paddy_type"]
    grade = data.get("grade") or None

    if quantity < 0:
        inventory = Inventory.objects.filter(
            warehouse=warehouse, paddy_type=paddy_type, grade=grade
        ).first()
        available = inventory.quantity if inventory else 0
        if available + quantity < 0:
            return f"Only {available} kg of this paddy type/grade is available to remove."
        if warehouse.current_stock + quantity < 0:
            return "Cannot remove more stock than the warehouse currently holds."

    with transaction.atomic():
        Warehouse.objects.filter(pk=warehouse.pk).update(
            current_stock=F("current_stock") + quantity
        )
        warehouse.refresh_from_db(fields=["current_stock"])
        _log_transaction(
            warehouse,
            TransactionLog.TransactionType.MANUAL_ADJUSTMENT,
            quantity,
            paddy_type=paddy_type,
            grade=grade,
            updated_by=user,
            notes=data.get("notes", ""),
        )

    if quantity > 0:
        _raise_high_capacity_alert(warehouse, warehouse.current_stock)
    else:
        raise_low_stock_alert(warehouse, warehouse.current_stock)

    log_audit(
        user, log_action, "farmers",
        f"{warehouse.name}: {'+' if quantity >= 0 else ''}{quantity} kg {paddy_type.type_name}",
    )
    return None


class OfficerHarvestViewSet(viewsets.ModelViewSet):
    """
    PMB officer management of Harvest records: CRUD plus the three
    workflow actions (approve/reject/collect) that drive a harvest through
    its status lifecycle. Viewing requires either "monitor_operations" or
    "record_purchases"; creating/editing/actions require "record_purchases".
    """

    queryset = Harvest.objects.select_related(
        "farmer", "paddy_type", "warehouse", "processed_by"
    ).order_by("-harvest_date")
    filter_backends = [OrderingFilter]
    ordering_fields = ["harvest_date", "farmer__reliability_score"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "record_purchases")]
        return [HasPermission("record_purchases")]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return OfficerHarvestWriteSerializer
        return OfficerHarvestSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Moves a pending harvest to "verified" once an officer has recorded
        its grade/moisture/quality-check/unit price, and creates (or
        updates, if approved before) the Payment owed to the farmer.
        """
        harvest = self.get_object()
        if harvest.status != Harvest.Status.PENDING:
            # Guards against double-approving or approving an already
            # rejected/collected harvest.
            return Response(
                {"detail": "Only pending harvests can be approved."}, status=400
            )
        if not harvest.unit_price or harvest.grade is None or harvest.quality_check is None:
            # The officer must have already filled in the assessment
            # fields (via update) before this harvest can be approved.
            return Response(
                {
                    "detail": "Grade, moisture level, quality check, and unit price "
                    "must be recorded before approving."
                },
                status=400,
            )

        harvest.status = Harvest.Status.VERIFIED
        harvest.processed_by = request.user
        harvest.save(update_fields=["status", "processed_by"])

        amount = harvest.quantity_kg * harvest.unit_price
        # update_or_create keyed on `harvest` ensures at most one Payment
        # per harvest — if this harvest was ever approved before (e.g. via
        # a retry), the existing Payment's amount is refreshed instead of
        # a duplicate row being inserted.
        Payment.objects.update_or_create(
            harvest=harvest,
            defaults={
                "farmer": harvest.farmer,
                "amount": amount,
                "status": Payment.Status.PENDING,
                "method": Payment.Method.CASH,
            },
        )
        log_audit(request.user, "approve_harvest", "farmers", f"Harvest #{harvest.id}")
        _notify_farmer(
            harvest,
            f"Your harvest submission of {harvest.quantity_kg} kg was approved "
            f"(Grade {harvest.grade}, Rs. {harvest.unit_price}/kg). Payment is now pending.",
        )
        return Response(OfficerHarvestSerializer(harvest).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Moves a pending harvest straight to "rejected" (a terminal state, no Payment is created)."""
        harvest = self.get_object()
        if harvest.status != Harvest.Status.PENDING:
            return Response(
                {"detail": "Only pending harvests can be rejected."}, status=400
            )
        harvest.status = Harvest.Status.REJECTED
        harvest.processed_by = request.user
        harvest.save(update_fields=["status", "processed_by"])
        recalculate_reliability_score(harvest.farmer)
        log_audit(request.user, "reject_harvest", "farmers", f"Harvest #{harvest.id}")
        _notify_farmer(
            harvest,
            f"Your harvest submission of {harvest.quantity_kg} kg was rejected. "
            "Contact your PMB officer if you have questions.",
        )
        return Response(OfficerHarvestSerializer(harvest).data)

    @action(detail=True, methods=["post"], url_path="collect")
    def mark_collected(self, request, pk=None):
        """
        Confirms the physical collection of a verified harvest: completes
        its Payment (marks paid, stamps today's date) and adds the
        harvested quantity into the destination warehouse's current stock.
        """
        harvest = self.get_object()
        if harvest.status != Harvest.Status.VERIFIED:
            # Can only collect a harvest that has already been through
            # approval (which is where grade/price/warehouse were set).
            return Response(
                {"detail": "Only verified harvests can be marked as collected."},
                status=400,
            )

        harvest.status = Harvest.Status.COLLECTED
        harvest.processed_by = request.user
        update_fields = ["status", "processed_by"]
        if not harvest.lot_code:
            harvest.lot_code = f"PMB-{harvest.id:06d}-{secrets.token_hex(3).upper()}"
            update_fields.append("lot_code")
        harvest.save(update_fields=update_fields)

        Payment.objects.filter(harvest=harvest).update(
            status=Payment.Status.PROCESSING, payment_date=timezone.now().date()
        )

        if harvest.warehouse_id:
            # Adds this harvest's quantity onto the warehouse's existing
            # stock. Note this reads current_stock in Python rather than
            # using an F() expression, so two collections hitting the same
            # warehouse at the exact same moment could in theory race.
            new_stock = harvest.warehouse.current_stock + harvest.quantity_kg
            Warehouse.objects.filter(pk=harvest.warehouse_id).update(current_stock=new_stock)
            _raise_high_capacity_alert(harvest.warehouse, new_stock)
            if harvest.paddy_type_id:
                _log_transaction(
                    harvest.warehouse,
                    TransactionLog.TransactionType.HARVEST_COLLECTION,
                    harvest.quantity_kg,
                    paddy_type=harvest.paddy_type,
                    grade=harvest.grade,
                    harvest=harvest,
                    updated_by=request.user,
                )

        recalculate_reliability_score(harvest.farmer)
        log_audit(request.user, "collect_harvest", "farmers", f"Harvest #{harvest.id}")
        _notify_farmer(
            harvest,
            f"Your harvest of {harvest.quantity_kg} kg has been collected. "
            "Your payment is now being processed for disbursement.",
        )
        return Response(OfficerHarvestSerializer(harvest).data)

    @action(detail=True, methods=["post"])
    def verify_transaction(self, request, pk=None):
        """
        Records an after-the-fact accountability sign-off on a collected
        harvest — an additional check, not a new gate (see
        TransactionVerification's docstring in models.py). Only makes sense
        once the harvest has actually been collected.
        """
        harvest = self.get_object()
        if harvest.status != Harvest.Status.COLLECTED:
            return Response(
                {"detail": "Only collected harvests can be verified."}, status=400
            )
        serializer = TransactionVerificationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        verification = serializer.save(harvest=harvest, verified_by=request.user)
        log_audit(request.user, "verify_transaction", "farmers", f"Harvest #{harvest.id}")
        return Response(TransactionVerificationSerializer(verification).data, status=201)


class OfficerPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    PMB officer view of every farmer Payment, plus the disburse/mark_failed
    actions that record what actually happened to a queued payout — each
    requires an input, mirroring mills.License's suspend/revoke actions
    (a real decision needs a recorded reason/reference, not a bare click).
    """

    queryset = Payment.objects.select_related("farmer", "harvest").order_by("-payment_date", "-id")
    serializer_class = OfficerPaymentSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "record_purchases")]
        return [HasPermission("record_purchases")]

    @action(detail=True, methods=["post"])
    def disburse(self, request, pk=None):
        """Marks a processing payment as disbursed, recording the disbursement reference (e.g. a bank transfer id)."""
        payment = self.get_object()
        if payment.status != Payment.Status.PROCESSING:
            return Response({"detail": "Only a processing payment can be marked disbursed."}, status=400)
        reference = request.data.get("disbursement_reference", "").strip()
        if not reference:
            return Response({"detail": "A disbursement reference is required."}, status=400)

        payment.status = Payment.Status.DISBURSED
        payment.disbursement_reference = reference
        payment.disbursed_date = timezone.now().date()
        payment.save(update_fields=["status", "disbursement_reference", "disbursed_date"])
        log_audit(request.user, "disburse_payment", "farmers", f"Payment #{payment.id}: {reference}")
        return Response(self.get_serializer(payment).data)

    @action(detail=True, methods=["post"])
    def mark_failed(self, request, pk=None):
        """Marks a processing payment as failed, recording a required reason (reused via disbursement_reference)."""
        payment = self.get_object()
        if payment.status != Payment.Status.PROCESSING:
            return Response({"detail": "Only a processing payment can be marked failed."}, status=400)
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"detail": "A reason is required."}, status=400)

        payment.status = Payment.Status.FAILED
        payment.disbursement_reference = reason
        payment.save(update_fields=["status", "disbursement_reference"])
        log_audit(request.user, "fail_payment", "farmers", f"Payment #{payment.id}: {reason}")
        return Response(self.get_serializer(payment).data)


class PublicHarvestTraceView(APIView):
    """
    Public (no auth) farm-to-warehouse traceability lookup by lot_code —
    proof a collected lot passed through real, quality-checked, verified
    channels. Only farmer registration_no + district are exposed, never
    name/NIC/contact/bank details (see this feature's privacy scope).
    """

    permission_classes = [AllowAny]

    def get(self, request, lot_code):
        harvest = get_object_or_404(
            Harvest.objects.select_related("farmer", "farmer__district", "paddy_type", "warehouse", "warehouse__district"),
            lot_code=lot_code,
        )
        farmer = harvest.farmer
        warehouse = harvest.warehouse
        return Response(
            {
                "lot_code": harvest.lot_code,
                "paddy_type": harvest.paddy_type.type_name if harvest.paddy_type else None,
                "variety": harvest.paddy_type.variety if harvest.paddy_type else None,
                "quantity_kg": harvest.quantity_kg,
                "grade": harvest.grade,
                "quality_check": harvest.quality_check,
                "harvest_date": harvest.harvest_date,
                "purchase_date": harvest.purchase_date,
                "status": harvest.status,
                "warehouse_name": warehouse.name if warehouse else None,
                "warehouse_district": warehouse.district.name if warehouse and warehouse.district else None,
                "farmer_registration_no": farmer.registration_no,
                "farmer_district": farmer.district.name if farmer.district else None,
            }
        )


class PublicHarvestTraceQrView(APIView):
    """Generates a QR PNG (on the fly, never stored) encoding the public trace page's URL for this lot."""

    permission_classes = [AllowAny]

    def get(self, request, lot_code):
        get_object_or_404(Harvest, lot_code=lot_code)
        img = qrcode.make(f"{settings.FRONTEND_URL}/trace/{lot_code}")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return HttpResponse(buffer.getvalue(), content_type="image/png")


@method_decorator(cache_page(60 * 15), name="get")
class PublicTransparencyStatsView(APIView):
    """
    Public (no auth) aggregate-only stats for the /transparency page: total
    volume purchased, guaranteed price trend, and warehouse/district/farmer
    counts. Never exposes any per-farmer or per-harvest data. Cached for 15
    minutes since it's unauthenticated and cheap to serve slightly stale.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        current_year = timezone.now().year
        total_purchased_kg = Harvest.objects.filter(
            status=Harvest.Status.COLLECTED, harvest_date__year=current_year
        ).aggregate(total=Sum("quantity_kg"))["total"] or 0

        since = timezone.now().date() - timedelta(days=365)
        price_by_paddy_type = []
        for paddy_type in PaddyType.objects.filter(is_active=True):
            avg_price = paddy_type.price_records.filter(
                effective_date__gte=since
            ).aggregate(avg=Avg("guaranteed_price"))["avg"]
            price_by_paddy_type.append(
                {
                    "paddy_type": paddy_type.type_name,
                    "average_price": float(avg_price) if avg_price is not None else float(paddy_type.guaranteed_price),
                    "current_price": float(paddy_type.guaranteed_price),
                }
            )

        active_warehouses = Warehouse.objects.filter(status=Warehouse.Status.ACTIVE)
        district_count = District.objects.filter(warehouses__in=active_warehouses).distinct().count()

        return Response(
            {
                "year": current_year,
                "total_purchased_kg": float(total_purchased_kg),
                "monthly_volume": _harvest_trend(
                    Harvest.objects.filter(status=Harvest.Status.COLLECTED), weeks=12
                ),
                "price_by_paddy_type": price_by_paddy_type,
                "active_warehouse_count": active_warehouses.count(),
                "district_count": district_count,
                "registered_farmer_count": Farmer.objects.count(),
            }
        )


class OfficerDashboardView(APIView):
    """Aggregate stats for the PMB officer dashboard: warehouse/stock totals, pending approvals, and recent harvests."""

    permission_classes = [HasPermission("monitor_operations")]

    def get(self, request):
        warehouses = Warehouse.objects.all()
        total_stock = warehouses.aggregate(total=Sum("current_stock"))["total"] or 0
        pending_count = Harvest.objects.filter(status=Harvest.Status.PENDING).count()
        active_paddy_types = PaddyType.objects.filter(is_active=True).count()
        recent_harvests = Harvest.objects.select_related(
            "farmer", "paddy_type", "warehouse"
        ).order_by("-harvest_date")[:6]

        return Response(
            {
                "kpis": {
                    "total_warehouses": warehouses.count(),
                    "total_stock": total_stock,
                    "pending_approvals": pending_count,
                    "active_paddy_types": active_paddy_types,
                },
                "recent_harvests": OfficerHarvestSerializer(recent_harvests, many=True).data,
                "warehouse_stock": WarehouseSerializer(warehouses, many=True).data,
                "charts": {
                    "status_breakdown": _status_breakdown(Harvest.objects.all()),
                    # ~4 months, per officer feedback (was 12 weeks).
                    "harvest_trend": _harvest_trend(Harvest.objects.all(), weeks=17),
                },
            }
        )


class OfficerReportsView(APIView):
    """
    JSON version of the officer report: a warehouse stock report and a
    transaction report of the 100 most recent verified/collected harvests
    with their payment status (see reports.build_officer_report_data).
    """

    permission_classes = [HasPermission("generate_reports")]

    def get(self, request):
        return Response(build_officer_report_data())


class OfficerReportsPdfView(APIView):
    """PDF version of the officer report, streamed back as a downloadable file attachment."""

    permission_classes = [HasPermission("generate_reports")]

    def get(self, request):
        data = build_officer_report_data()
        buffer = build_officer_report_pdf(data)
        log_audit(request.user, "download_officer_report_pdf", "farmers")
        return FileResponse(
            buffer,
            as_attachment=True,
            filename="pmb-officer-report.pdf",
            content_type="application/pdf",
        )


# ---------------------------------------------------------------------------
# Transportation: vehicle fleet, drivers, routes, and deliveries. All
# gated behind "manage_transport" (PMB Officer only) — unlike Warehouses/
# PaddyTypes, there's no broader read audience (farmers/other staff never
# need to see the fleet), so list/retrieve isn't opened up separately.
# ---------------------------------------------------------------------------
class VehicleViewSet(viewsets.ModelViewSet):
    """
    CRUD over the vehicle fleet (officer-only writes); list/retrieve is
    also open to drivers, who need the fleet to log fuel/maintenance
    against a vehicle from their own portal.
    """

    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [CanViewVehicles()]
        return [HasPermission("manage_transport")]


class DriverOptionsView(generics.ListAPIView):
    """
    GET /api/admin/drivers/ — lightweight list of User accounts with the
    "driver" role, for the Delivery form's driver picker. Drivers are real
    login accounts (see accounts app), not a Transportation-owned model,
    so this reads from `accounts.User` rather than a local table.
    """

    permission_classes = [HasPermission("manage_transport")]

    def get_queryset(self):
        return User.objects.filter(role__slug="driver").order_by("full_name")

    def list(self, request, *args, **kwargs):
        return Response(
            [{"id": str(u.id), "name": u.full_name} for u in self.get_queryset()]
        )


class RouteViewSet(viewsets.ModelViewSet):
    """CRUD over reusable delivery routes."""

    permission_classes = [HasPermission("manage_transport")]
    queryset = Route.objects.all()
    serializer_class = RouteSerializer


def _notify_driver_assigned(delivery, assigned_by):
    """Sends the driver a Message when they're assigned (or reassigned) a delivery task."""
    Message.objects.create(
        sender=assigned_by,
        recipient=delivery.driver,
        body=(
            f"You've been assigned a new delivery task: {delivery.route.origin} → "
            f"{delivery.route.destination} on {delivery.scheduled_date}. "
            "Go to your dashboard to accept or reject it."
        ),
    )


def _send_delivery_reminder(delivery):
    """
    Reminds a delivery's assigned driver that they haven't accepted a task
    starting within the next 3 hours — called by the send_delivery_reminders
    management command, not from a request. Sent over all three channels
    unconditionally (no opt-in preference, unlike Farmer.notify_via_sms):
    this is a time-sensitive accept-or-miss-it deadline, not a routine
    update. Each channel's failure is caught independently so one bad send
    (e.g. no SMTP configured) doesn't stop the others or abort the batch.
    """
    driver = delivery.driver
    body = (
        f"Reminder: you haven't responded to delivery #{delivery.id} "
        f"({delivery.route.origin} → {delivery.route.destination}), scheduled to start at "
        f"{delivery.scheduled_time.strftime('%H:%M')} on {delivery.scheduled_date}. "
        "Please accept or reject it soon."
    )

    if delivery.approved_by_id:
        Message.objects.create(sender=delivery.approved_by, recipient=driver, body=body)

    if driver.phone_number:
        send_sms(driver.phone_number, body)

    try:
        send_mail(
            subject="Smart PMB: unaccepted delivery starting soon",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[driver.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to send delivery-reminder email to %s", driver.email)


class DeliveryViewSet(viewsets.ModelViewSet):
    """
    CRUD over deliveries, plus a lightweight `update_status` action.
    scheduled -> in_transit -> delivered is entirely driver-driven (see
    DriverDeliveryStatusView on DriverDeliveryViewSet below, gated by
    access_driver_portal); `update_status` here is officer-only and
    restricted to the two exceptional states the driver can't set
    themselves, delayed/cancelled. Assigning (or reassigning) a driver
    notifies them and resets `assignment_status` to "pending" so they see
    it as a new task to accept/reject.
    """

    permission_classes = [HasPermission("manage_transport")]
    queryset = Delivery.objects.select_related("vehicle", "driver", "route", "warehouse", "approved_by")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DeliveryWriteSerializer
        return DeliverySerializer

    def perform_create(self, serializer):
        delivery = serializer.save(approved_by=self.request.user)
        _notify_driver_assigned(delivery, self.request.user)

    def perform_update(self, serializer):
        previous_driver_id = serializer.instance.driver_id
        previous_status = serializer.instance.status
        delivery = serializer.save()
        if delivery.driver_id != previous_driver_id:
            delivery.assignment_status = Delivery.AssignmentStatus.PENDING
            update_fields = ["assignment_status"]
            # Reassigning the driver on a delivery a previous driver
            # rejected (see DeliveryRespondView) revives it back to
            # scheduled — otherwise it'd stay stuck showing "Cancelled"
            # forever despite now having a fresh driver to try.
            if previous_status == Delivery.Status.CANCELLED:
                delivery.status = Delivery.Status.SCHEDULED
                update_fields.append("status")
            delivery.save(update_fields=update_fields)
            _notify_driver_assigned(delivery, self.request.user)

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get("status")
        valid = [Delivery.Status.DELAYED, Delivery.Status.CANCELLED]
        if new_status not in valid:
            return Response(
                {"detail": f"Officers can only mark a delivery Delayed or Cancelled — scheduled/in_transit/delivered are set by the driver. Choose from {valid}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delivery.status = new_status
        delivery.save(update_fields=["status"])
        if new_status == Delivery.Status.DELIVERED:
            _handle_delivery_delivered(delivery, request.user)
        return Response(DeliverySerializer(delivery).data)


class FuelRecordViewSet(viewsets.ModelViewSet):
    """
    Read-only from the officer side — fuel records are entered by the
    driver who bought the fuel (see DriverFuelRecordViewSet), not the
    officer. Kept as a ModelViewSet (rather than a plain ListAPIView) so
    the Transportation page can still retrieve individual records if ever
    needed, just never create/edit/delete them.
    """

    http_method_names = ["get", "head", "options"]
    permission_classes = [HasPermission("manage_transport")]
    queryset = FuelRecord.objects.select_related("vehicle")
    serializer_class = FuelRecordSerializer


class MaintenanceRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only from the officer side, plus approve/reject actions to review
    a driver-logged maintenance cost — mirrors LicenseApplicationViewSet's
    approve/reject exactly (accounts/views.py), just on a different model.
    ReadOnlyModelViewSet (not ModelViewSet + a restricted http_method_names)
    so there's no create/update/destroy to accidentally re-expose by
    routing a POST through the approve/reject actions below.
    """

    permission_classes = [HasPermission("manage_transport")]
    queryset = MaintenanceRecord.objects.select_related("vehicle", "reviewed_by")
    serializer_class = MaintenanceRecordSerializer

    def get_queryset(self):
        # Optional ?status=pending filter for a "needs review" default view.
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        record = self.get_object()
        record.status = MaintenanceRecord.Status.APPROVED
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()
        record.rejection_reason = ""
        record.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        log_audit(request.user, "approve_maintenance_record", "farmers", str(record.vehicle))
        return Response(MaintenanceRecordSerializer(record).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        serializer = MaintenanceDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record = self.get_object()
        record.status = MaintenanceRecord.Status.REJECTED
        record.reviewed_by = request.user
        record.reviewed_at = timezone.now()
        record.rejection_reason = serializer.validated_data["reason"]
        record.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        log_audit(request.user, "reject_maintenance_record", "farmers", str(record.vehicle))
        return Response(MaintenanceRecordSerializer(record).data)


# ---------------------------------------------------------------------------
# Driver portal: a driver's own dashboard, task accept/reject, delivery
# status progression, live-location reporting, and their own fuel/
# maintenance entry — all scoped to `driver=request.user`, gated by the
# "access_driver_portal" codename (see accounts/migrations/0032), granted
# only to the "driver" role by default — real RBAC, revocable or grantable
# to any role from /roles, same mechanism admin/officer endpoints use.
# Every other operational portal (farmer, mill_owner, authorized_purchaser,
# warehouse_manager) follows the same access_<role>_portal pattern now
# (see accounts/migrations/0033) — this was just the first one converted.
# ---------------------------------------------------------------------------
class DriverDashboardView(APIView):
    """Aggregates a logged-in driver's pending/active/recent delivery tasks."""

    permission_classes = [HasPermission("access_driver_portal")]

    def get(self, request):
        deliveries = Delivery.objects.filter(driver=request.user).select_related(
            "vehicle", "route", "warehouse"
        )
        pending_tasks = deliveries.filter(assignment_status=Delivery.AssignmentStatus.PENDING)
        active_task = deliveries.filter(
            assignment_status=Delivery.AssignmentStatus.ACCEPTED,
            status__in=[Delivery.Status.SCHEDULED, Delivery.Status.IN_TRANSIT],
        ).first()
        recent = deliveries.filter(
            assignment_status=Delivery.AssignmentStatus.ACCEPTED,
            status__in=[Delivery.Status.DELIVERED, Delivery.Status.CANCELLED, Delivery.Status.DELAYED],
        )[:5]

        return Response(
            {
                "pending_tasks": DeliverySerializer(pending_tasks, many=True).data,
                "active_task": DeliverySerializer(active_task).data if active_task else None,
                "recent_deliveries": DeliverySerializer(recent, many=True).data,
                "kpis": {
                    "total_deliveries": deliveries.filter(
                        assignment_status=Delivery.AssignmentStatus.ACCEPTED
                    ).count(),
                    "completed_deliveries": deliveries.filter(status=Delivery.Status.DELIVERED).count(),
                    "pending_tasks": pending_tasks.count(),
                },
            }
        )


class DriverVehicleInfoView(APIView):
    """
    Read-only reference view for a driver's own portal: full spec sheet of
    every vehicle they've been assigned (registration/model/size/capacity),
    every route those deliveries used, and their complete delivery history
    — all scoped to `driver=request.user` (a driver never sees another
    driver's fleet/routes/deliveries). No write actions live here; editing
    vehicles/routes/deliveries stays officer-only (`manage_transport`).
    """

    permission_classes = [HasPermission("access_driver_portal")]

    def get(self, request):
        deliveries = Delivery.objects.filter(driver=request.user).select_related(
            "vehicle", "route", "warehouse"
        )
        vehicles = Vehicle.objects.filter(
            id__in=deliveries.values_list("vehicle_id", flat=True).distinct()
        )
        routes = Route.objects.filter(
            id__in=deliveries.values_list("route_id", flat=True).distinct()
        )

        return Response(
            {
                "vehicles": VehicleSerializer(vehicles, many=True).data,
                "routes": RouteSerializer(routes, many=True).data,
                "deliveries": DeliverySerializer(deliveries.order_by("-scheduled_date"), many=True).data,
            }
        )


class DeliveryRespondView(APIView):
    """
    POST {"accept": true/false} — the driver accepts or rejects a task
    assigned to them. A rejection also cancels the delivery's `status`
    (nothing is moving until an officer reassigns a different driver) —
    reassigning the driver on this delivery afterward (DeliveryViewSet.
    perform_update) resets it back to SCHEDULED so it's usable again.
    """

    permission_classes = [HasPermission("access_driver_portal")]

    def post(self, request, pk):
        delivery = get_object_or_404(
            Delivery, pk=pk, driver=request.user, assignment_status=Delivery.AssignmentStatus.PENDING
        )
        accept = request.data.get("accept")
        if not isinstance(accept, bool):
            return Response({"detail": "accept must be true or false."}, status=status.HTTP_400_BAD_REQUEST)

        delivery.assignment_status = (
            Delivery.AssignmentStatus.ACCEPTED if accept else Delivery.AssignmentStatus.REJECTED
        )
        update_fields = ["assignment_status"]
        if not accept:
            delivery.status = Delivery.Status.CANCELLED
            update_fields.append("status")
        delivery.save(update_fields=update_fields)

        if not accept and delivery.approved_by:
            Message.objects.create(
                sender=request.user,
                recipient=delivery.approved_by,
                body=(
                    f"{request.user.full_name} declined the delivery task "
                    f"({delivery.route.origin} → {delivery.route.destination}, "
                    f"{delivery.scheduled_date}). It needs to be reassigned."
                ),
            )

        return Response(DeliverySerializer(delivery).data)


class DriverDeliveryStatusView(APIView):
    """
    POST {"status": "in_transit"|"delivered"} — the driver progresses their
    own accepted task ("Start Trip" / "Mark Delivered"). Narrower than the
    officer's `update_status` action (delayed/cancelled stay an officer
    override), and only works on a task this driver has accepted.
    """

    permission_classes = [HasPermission("access_driver_portal")]

    def post(self, request, pk):
        delivery = get_object_or_404(
            Delivery, pk=pk, driver=request.user, assignment_status=Delivery.AssignmentStatus.ACCEPTED
        )
        new_status = request.data.get("status")
        if new_status not in (Delivery.Status.IN_TRANSIT, Delivery.Status.DELIVERED):
            return Response(
                {"detail": "status must be 'in_transit' or 'delivered'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delivery.status = new_status
        delivery.save(update_fields=["status"])
        if new_status == Delivery.Status.DELIVERED:
            _handle_delivery_delivered(delivery, request.user)
        return Response(DeliverySerializer(delivery).data)


class DeliveryLocationPingView(APIView):
    """POST {"latitude", "longitude"} — the driver's browser reports its position while a task is in transit."""

    permission_classes = [HasPermission("access_driver_portal")]

    def post(self, request, pk):
        delivery = get_object_or_404(
            Delivery,
            pk=pk,
            driver=request.user,
            assignment_status=Delivery.AssignmentStatus.ACCEPTED,
            status=Delivery.Status.IN_TRANSIT,
        )
        serializer = DeliveryLocationPingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(delivery=delivery)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DriverFuelRecordViewSet(viewsets.ModelViewSet):
    """The driver-side counterpart to FuelRecordViewSet — full CRUD, since fuel entries are now driver-owned."""

    permission_classes = [HasPermission("access_driver_portal")]
    queryset = FuelRecord.objects.select_related("vehicle")
    serializer_class = FuelRecordSerializer


class DriverMaintenanceRecordViewSet(viewsets.ModelViewSet):
    """
    The driver-side counterpart to MaintenanceRecordViewSet — full CRUD,
    except a record that's already been reviewed (approved or rejected)
    locks against further edits/deletes, so an officer's decision on a
    specific cost can't be silently undermined afterward. A fresh record
    always starts PENDING, so creation is unaffected.
    """

    permission_classes = [HasPermission("access_driver_portal")]
    queryset = MaintenanceRecord.objects.select_related("vehicle")
    serializer_class = MaintenanceRecordSerializer

    def _reject_if_reviewed(self, instance):
        if instance.status != MaintenanceRecord.Status.PENDING:
            raise ValidationError(
                "This record has already been reviewed and can no longer be edited."
            )

    def perform_update(self, serializer):
        self._reject_if_reviewed(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._reject_if_reviewed(instance)
        instance.delete()


class TransportationDashboardView(APIView):
    """
    Summary stats for the Transportation page's header: fleet/driver
    counts by status, delivery counts by status, and running fuel/
    maintenance cost totals.
    """

    permission_classes = [HasPermission("manage_transport")]

    def get(self, request):
        vehicles = Vehicle.objects.all()
        drivers = User.objects.filter(role__slug="driver")
        deliveries = Delivery.objects.all()
        # "Available" = not currently the driver on an in-transit delivery.
        # There's no separate status field on User the way the old Driver
        # roster had one — this is derived instead, so it can't drift out
        # of sync with what's actually happening on the Deliveries tab.
        busy_driver_ids = deliveries.filter(status=Delivery.Status.IN_TRANSIT).values_list(
            "driver_id", flat=True
        )

        return Response(
            {
                "vehicles_total": vehicles.count(),
                "vehicles_active": vehicles.filter(status=Vehicle.Status.ACTIVE).count(),
                "drivers_total": drivers.count(),
                "drivers_available": drivers.exclude(id__in=busy_driver_ids).count(),
                "deliveries_scheduled": deliveries.filter(status=Delivery.Status.SCHEDULED).count(),
                "deliveries_in_transit": deliveries.filter(status=Delivery.Status.IN_TRANSIT).count(),
                "fuel_cost_total": float(
                    FuelRecord.objects.aggregate(total=Sum("cost"))["total"] or 0
                ),
                "maintenance_cost_total": float(
                    MaintenanceRecord.objects.aggregate(total=Sum("cost"))["total"] or 0
                ),
            }
        )
