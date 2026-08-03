# API views for the farmers app: public district lookup, a farmer's own
# dashboard/notifications, and the PMB officer/admin-facing management of
# warehouses, paddy types, and the harvest approval workflow (the core
# business logic of the whole system lives in OfficerHarvestViewSet below).
import io
import secrets
from datetime import timedelta

import qrcode
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, F, Sum
from django.db.models.functions import TruncWeek
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
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
from sysops.utils import log_audit

from .pdf import build_officer_report_pdf
from .reports import build_officer_report_data
from .scoring import recalculate_reliability_score

from .models import (
    Delivery,
    DeliveryLocationPing,
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
)
from .permissions import CanViewVehicles, IsDriver, IsFarmer
from .serializers import (
    DeliveryLocationPingSerializer,
    DeliverySerializer,
    DeliveryWriteSerializer,
    DistrictSerializer,
    FarmerBankDetailsSerializer,
    FarmerHarvestCreateSerializer,
    FarmerOptionSerializer,
    FuelRecordSerializer,
    HarvestSerializer,
    InventorySerializer,
    MaintenanceRecordSerializer,
    NotificationSerializer,
    OfficerHarvestSerializer,
    OfficerHarvestWriteSerializer,
    PaddyTypeSerializer,
    PaddyTypeWriteSerializer,
    PriceRecordSerializer,
    RouteSerializer,
    TransactionLogSerializer,
    TransactionVerificationSerializer,
    TransactionVerificationWriteSerializer,
    VehicleSerializer,
    WarehouseManagerSelfUpdateSerializer,
    WarehouseSerializer,
    WarehouseStockAdjustmentSerializer,
    WarehouseWriteSerializer,
)
from .models import District


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


class FarmerDashboardView(APIView):
    """Aggregates a logged-in farmer's own profile, recent harvests/payments/notifications, and KPI summary."""

    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        farmer = get_object_or_404(
            Farmer.objects.select_related("district", "province"), user=request.user
        )

        harvests = farmer.harvests.select_related("paddy_type")[:6]
        payments = farmer.payments.all()
        notifications = farmer.notifications.all()[:6]
        paddy_types = PaddyType.objects.filter(is_active=True)

        total_earnings = payments.filter(status="completed").aggregate(
            total=Sum("amount")
        )["total"] or 0
        pending_payments = payments.filter(status="pending").count()

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
                    "reliability_score": farmer.reliability_score,
                },
                "kpis": {
                    "total_harvests": farmer.harvests.count(),
                    "pending_payments": pending_payments,
                    "total_earnings": total_earnings,
                },
                "paddy_types": PaddyTypeSerializer(paddy_types, many=True).data,
                "harvests": HarvestSerializer(harvests, many=True).data,
                "notifications": NotificationSerializer(notifications, many=True).data,
                "charts": {
                    "status_breakdown": _status_breakdown(farmer.harvests),
                    "harvest_trend": _harvest_trend(farmer.harvests),
                },
            }
        )


class FarmerBankDetailsView(APIView):
    """Lets the logged-in farmer view (GET) and edit (PATCH) their own payout bank details."""

    permission_classes = [IsAuthenticated, IsFarmer]

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

    permission_classes = [IsAuthenticated, IsFarmer]

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

    permission_classes = [IsAuthenticated, IsFarmer]
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


class FarmerListView(generics.ListAPIView):
    """List of all farmers (name + registration number) for the officer UI's farmer picker when recording a purchase."""

    permission_classes = [HasPermission("record_purchases")]
    queryset = Farmer.objects.all().order_by("name")
    serializer_class = FarmerOptionSerializer


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


class WarehouseManagerDashboardView(APIView):
    """
    GET /api/warehouse-manager/dashboard/ — the single warehouse this
    logged-in warehouse_manager account manages (via Warehouse.managed_by),
    with its Inventory breakdown, recent TransactionLog entries, and any
    open capacity SystemAlerts for it. PATCH lets the manager update just
    their warehouse's `contact_number`/`status` (see
    WarehouseManagerSelfUpdateSerializer — everything structural stays
    officer/admin-only). No "manage_warehouses" permission is required for
    either — access is scoped by identity (only this user's own warehouse
    is ever returned/editable), same pattern as DriverDashboardView's
    `driver=request.user` filter.
    """

    permission_classes = [IsAuthenticated]

    def _get_own_warehouse(self, request):
        return Warehouse.objects.select_related("district", "province").filter(
            managed_by=request.user
        ).first()

    def _dashboard_payload(self, warehouse):
        inventory = Inventory.objects.filter(warehouse=warehouse).select_related(
            "paddy_type", "updated_by"
        )
        transactions = TransactionLog.objects.filter(warehouse=warehouse).order_by("-created_at")[:20]
        # Read-only: alert_type encodes the warehouse id the same way
        # _raise_high_capacity_alert/farmers.forecasting's predictive
        # version already do — acknowledging/resolving stays an
        # officer/admin-only action (SystemAlertViewSet, "manage_system"),
        # since SystemAlert covers alert types well beyond warehouse
        # capacity and isn't scoped to be safely self-served here.
        alerts = SystemAlert.objects.filter(
            alert_type__in=[
                f"high_capacity_warehouse_{warehouse.id}",
                f"predicted_capacity_warehouse_{warehouse.id}",
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


class WarehouseManagerAdjustStockView(APIView):
    """
    POST /api/warehouse-manager/adjust-stock/ — lets a warehouse_manager
    manually add/remove stock for the single warehouse they manage (via
    Warehouse.managed_by). Same underlying logic as
    WarehouseViewSet.adjust_stock (see _adjust_warehouse_stock above),
    scoped by identity rather than "manage_warehouses" — same access
    pattern as WarehouseManagerDashboardView.
    """

    permission_classes = [IsAuthenticated]

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

    permission_classes = [IsAuthenticated]

    def get(self, request):
        warehouse = Warehouse.objects.filter(managed_by=request.user).first()
        if not warehouse:
            return Response(
                {"detail": "You are not currently assigned to manage a warehouse."}, status=404
            )

        transactions = TransactionLog.objects.filter(warehouse=warehouse).order_by("-created_at")[:200]
        return Response(TransactionLogSerializer(transactions, many=True).data)


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
        if self.action in ("list", "retrieve"):
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
            paddy_type=paddy_type, guaranteed_price=paddy_type.guaranteed_price
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
                paddy_type=paddy_type, guaranteed_price=paddy_type.guaranteed_price
            )

    @action(detail=True, methods=["get"], url_path="price-history")
    def price_history(self, request, pk=None):
        """Historical guaranteed-price snapshots for this PaddyType, most recent first."""
        paddy_type = self.get_object()
        records = paddy_type.price_records.order_by("-effective_date")[:50]
        return Response(PriceRecordSerializer(records, many=True).data)


def _log_transaction(
    warehouse, transaction_type, quantity_change, paddy_type, grade=None,
    harvest=None, rice_request=None, updated_by=None, notes="",
):
    """
    Records a TransactionLog entry and updates the matching Inventory line
    (get_or_create'd on warehouse+paddy_type+grade, then adjusted by
    quantity_change via F()) — additive telemetry alongside
    Warehouse.current_stock, which stays the single source of truth for
    the aggregate number and is updated separately by the caller. Called
    from OfficerHarvestViewSet.mark_collected below (positive
    quantity_change), purchases.OfficerRiceRequestViewSet.fulfill (negative
    quantity_change), and WarehouseViewSet.adjust_stock above (either sign,
    the only caller that passes `notes`).
    """
    TransactionLog.objects.create(
        warehouse=warehouse,
        transaction_type=transaction_type,
        quantity_change=quantity_change,
        harvest=harvest,
        rice_request=rice_request,
        notes=notes,
    )
    inventory, _ = Inventory.objects.get_or_create(
        warehouse=warehouse, paddy_type=paddy_type, grade=grade,
    )
    Inventory.objects.filter(pk=inventory.pk).update(
        quantity=F("quantity") + quantity_change, updated_by=updated_by
    )


def _notify_farmer(harvest, message):
    """Creates a Notification the farmer sees on their dashboard — so a status change doesn't only show up if they happen to check back. Skipped if the farmer has turned harvest-update notifications off in Settings. Also sends an SMS via Text.lk if the farmer has opted into notify_via_sms."""
    farmer = harvest.farmer
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
            status=Payment.Status.COMPLETED, payment_date=timezone.now().date()
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
            "Payment has been completed.",
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
                    "harvest_trend": _harvest_trend(Harvest.objects.all()),
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


class DeliveryViewSet(viewsets.ModelViewSet):
    """
    CRUD over deliveries, plus a lightweight `update_status` action for
    moving a delivery through scheduled -> in_transit -> delivered (or
    delayed/cancelled) without resubmitting the full record. Assigning (or
    reassigning) a driver notifies them and resets `assignment_status` to
    "pending" so they see it as a new task to accept/reject — the driver's
    own acceptance/status-progression endpoints live on DriverDeliveryViewSet
    below, gated by IsDriver instead of manage_transport.
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
        delivery = serializer.save()
        if delivery.driver_id != previous_driver_id:
            delivery.assignment_status = Delivery.AssignmentStatus.PENDING
            delivery.save(update_fields=["assignment_status"])
            _notify_driver_assigned(delivery, self.request.user)

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get("status")
        valid = [c[0] for c in Delivery.Status.choices]
        if new_status not in valid:
            return Response(
                {"detail": f"Invalid status. Choose from {valid}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delivery.status = new_status
        delivery.save(update_fields=["status"])
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


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    """Read-only from the officer side — see FuelRecordViewSet's docstring; same reasoning."""

    http_method_names = ["get", "head", "options"]
    permission_classes = [HasPermission("manage_transport")]
    queryset = MaintenanceRecord.objects.select_related("vehicle")
    serializer_class = MaintenanceRecordSerializer


# ---------------------------------------------------------------------------
# Driver portal: a driver's own dashboard, task accept/reject, delivery
# status progression, live-location reporting, and their own fuel/
# maintenance entry — all scoped to `driver=request.user`, gated by
# IsDriver rather than any manage_transport-style codename permission
# (drivers have no RBAC permissions of their own, same pattern as farmers).
# ---------------------------------------------------------------------------
class DriverDashboardView(APIView):
    """Aggregates a logged-in driver's pending/active/recent delivery tasks."""

    permission_classes = [IsAuthenticated, IsDriver]

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

    permission_classes = [IsAuthenticated, IsDriver]

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
    """POST {"accept": true/false} — the driver accepts or rejects a task assigned to them."""

    permission_classes = [IsAuthenticated, IsDriver]

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
        delivery.save(update_fields=["assignment_status"])

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

    permission_classes = [IsAuthenticated, IsDriver]

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
        return Response(DeliverySerializer(delivery).data)


class DeliveryLocationPingView(APIView):
    """POST {"latitude", "longitude"} — the driver's browser reports its position while a task is in transit."""

    permission_classes = [IsAuthenticated, IsDriver]

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

    permission_classes = [IsAuthenticated, IsDriver]
    queryset = FuelRecord.objects.select_related("vehicle")
    serializer_class = FuelRecordSerializer


class DriverMaintenanceRecordViewSet(viewsets.ModelViewSet):
    """The driver-side counterpart to MaintenanceRecordViewSet — full CRUD."""

    permission_classes = [IsAuthenticated, IsDriver]
    queryset = MaintenanceRecord.objects.select_related("vehicle")
    serializer_class = MaintenanceRecordSerializer


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
