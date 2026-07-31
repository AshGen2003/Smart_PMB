# API views for the farmers app: public district lookup, a farmer's own
# dashboard/notifications, and the PMB officer/admin-facing management of
# warehouses, paddy types, and the harvest approval workflow (the core
# business logic of the whole system lives in OfficerHarvestViewSet below).
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncWeek
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Message, User
from accounts.permissions import HasAnyPermission, HasPermission
from sysops.utils import log_audit

from .pdf import build_officer_report_pdf
from .reports import build_officer_report_data

from .models import (
    Delivery,
    DeliveryLocationPing,
    Farmer,
    FuelRecord,
    Harvest,
    MaintenanceRecord,
    Notification,
    PaddyType,
    Payment,
    Route,
    Vehicle,
    Warehouse,
)
from .permissions import CanViewVehicles, IsDriver, IsFarmer
from .serializers import (
    DeliveryLocationPingSerializer,
    DeliverySerializer,
    DeliveryWriteSerializer,
    DistrictSerializer,
    FarmerHarvestCreateSerializer,
    FarmerOptionSerializer,
    FuelRecordSerializer,
    HarvestSerializer,
    MaintenanceRecordSerializer,
    NotificationSerializer,
    OfficerHarvestSerializer,
    OfficerHarvestWriteSerializer,
    PaddyTypeSerializer,
    PaddyTypeWriteSerializer,
    RouteSerializer,
    VehicleSerializer,
    WarehouseSerializer,
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

    def perform_update(self, serializer):
        paddy_type = serializer.save()
        log_audit(
            self.request.user, "update_paddy_type", "farmers",
            f"{paddy_type.type_name} @ Rs.{paddy_type.guaranteed_price}",
        )


class OfficerHarvestViewSet(viewsets.ModelViewSet):
    """
    PMB officer management of Harvest records: CRUD plus the three
    workflow actions (approve/reject/collect) that drive a harvest through
    its status lifecycle. Viewing requires either "monitor_operations" or
    "record_purchases"; creating/editing/actions require "record_purchases".
    """

    queryset = Harvest.objects.select_related("farmer", "paddy_type", "warehouse").order_by(
        "-harvest_date"
    )

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
        harvest.save(update_fields=["status"])

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
        harvest.save(update_fields=["status"])
        log_audit(request.user, "reject_harvest", "farmers", f"Harvest #{harvest.id}")
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
        harvest.save(update_fields=["status"])

        Payment.objects.filter(harvest=harvest).update(
            status=Payment.Status.COMPLETED, payment_date=timezone.now().date()
        )

        if harvest.warehouse_id:
            # Adds this harvest's quantity onto the warehouse's existing
            # stock. Note this reads current_stock in Python rather than
            # using an F() expression, so two collections hitting the same
            # warehouse at the exact same moment could in theory race.
            Warehouse.objects.filter(pk=harvest.warehouse_id).update(
                current_stock=harvest.warehouse.current_stock + harvest.quantity_kg
            )

        log_audit(request.user, "collect_harvest", "farmers", f"Harvest #{harvest.id}")
        return Response(OfficerHarvestSerializer(harvest).data)


class OfficerDashboardView(APIView):
    """
    Aggregate stats for the PMB officer dashboard: warehouse/stock totals,
    pending approvals, and recent harvests. Also shown to record_purchases
    holders (e.g. Authorized Purchasers) so they land on real operational
    data instead of the generic placeholder dashboard.
    """

    permission_classes = [HasAnyPermission("monitor_operations", "record_purchases")]

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
