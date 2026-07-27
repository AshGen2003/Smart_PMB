# API views for the farmers app: public district lookup, a farmer's own
# dashboard/notifications, and the PMB officer/admin-facing management of
# warehouses, paddy types, and the harvest approval workflow (the core
# business logic of the whole system lives in OfficerHarvestViewSet below).
from datetime import timedelta

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncMonth, TruncWeek
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasAnyPermission, HasPermission
from sysops.utils import log_audit

from .models import Farmer, Harvest, Notification, PaddyType, Payment, Warehouse
from .permissions import IsFarmer
from .serializers import (
    DistrictSerializer,
    FarmerHarvestCreateSerializer,
    FarmerOptionSerializer,
    HarvestSerializer,
    NotificationSerializer,
    OfficerHarvestSerializer,
    OfficerHarvestWriteSerializer,
    PaddyTypeSerializer,
    PaddyTypeWriteSerializer,
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
    Builds the data behind the officer-facing reports screen: a
    warehouse stock report and a transaction report of the 100 most
    recent verified/collected harvests with their payment status.
    """

    permission_classes = [HasPermission("generate_reports")]

    def get(self, request):
        warehouses = Warehouse.objects.select_related("district", "province").order_by("name")
        stock_report = WarehouseSerializer(warehouses, many=True).data

        # Only harvests that have passed approval are meaningful "purchase
        # transactions"; pending/rejected ones aren't purchases yet.
        approved = Harvest.objects.filter(
            status__in=[Harvest.Status.VERIFIED, Harvest.Status.COLLECTED]
        )
        transactions = approved.select_related(
            "farmer", "paddy_type", "warehouse"
        ).prefetch_related("payments").order_by("-harvest_date")[:100]

        transaction_report = []
        for harvest in transactions:
            payment = harvest.payments.first()
            transaction_report.append(
                {
                    "id": harvest.id,
                    "purchase_date": harvest.purchase_date or harvest.harvest_date,
                    "farmer_name": harvest.farmer.name,
                    "paddy_type": harvest.paddy_type.type_name if harvest.paddy_type else None,
                    "warehouse": harvest.warehouse.name if harvest.warehouse else None,
                    "quantity_kg": harvest.quantity_kg,
                    "unit_price": harvest.unit_price,
                    "amount": payment.amount if payment else None,
                    "payment_status": payment.status if payment else None,
                    "status": harvest.status,
                }
            )

        grade_counts = {
            row["grade"]: row["count"]
            for row in approved.exclude(grade=None).values("grade").annotate(count=Count("id"))
        }
        grade_distribution = [
            {"grade": grade, "count": grade_counts.get(grade, 0)}
            for grade, _ in Harvest.Grade.choices
        ]

        payment_counts = {
            row["status"]: row["count"]
            for row in Payment.objects.values("status").annotate(count=Count("id"))
        }
        payment_status_breakdown = [
            {"status": status, "label": label, "count": payment_counts.get(status, 0)}
            for status, label in Payment.Status.choices
        ]

        # Cast Decimal -> float here too, same reasoning as _harvest_trend.
        # The annotation keys below are deliberately not named "quantity_kg"/
        # "amount" (matching the source columns): naming an annotation the
        # same as a field it's derived from makes Django resolve later F()
        # references in the same .annotate() call against that new
        # aggregate annotation instead of the raw column, which raises
        # "... is an aggregate" (aggregate-of-an-aggregate) here.
        monthly_purchases = [
            {
                "period": row["month"].strftime("%b %Y"),
                "quantity_kg": float(row["total_quantity_kg"] or 0),
                "amount": float(row["total_amount"] or 0),
            }
            for row in approved.annotate(month=TruncMonth("harvest_date"))
            .values("month")
            .annotate(
                total_quantity_kg=Sum("quantity_kg"),
                total_amount=Sum(
                    ExpressionWrapper(
                        F("quantity_kg") * F("unit_price"),
                        output_field=DecimalField(max_digits=14, decimal_places=2),
                    )
                ),
            )
            .order_by("month")
        ]

        return Response(
            {
                "stock_report": stock_report,
                "transaction_report": transaction_report,
                "charts": {
                    "grade_distribution": grade_distribution,
                    "payment_status_breakdown": payment_status_breakdown,
                    "monthly_purchases": monthly_purchases,
                },
            }
        )
