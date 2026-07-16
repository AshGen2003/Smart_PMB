from django.db.models import Sum
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


class DistrictListView(generics.ListAPIView):
    queryset = District.objects.select_related("province").order_by("name")
    serializer_class = DistrictSerializer
    permission_classes = [AllowAny]


class FarmerDashboardView(APIView):
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
            }
        )


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated, IsFarmer]

    def post(self, request, pk):
        notification = get_object_or_404(
            Notification, pk=pk, farmer__user=request.user
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FarmerListView(generics.ListAPIView):
    permission_classes = [HasPermission("record_purchases")]
    queryset = Farmer.objects.all().order_by("name")
    serializer_class = FarmerOptionSerializer


class WarehouseViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission("manage_warehouses")]
    queryset = Warehouse.objects.select_related("district", "province").order_by("name")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return WarehouseWriteSerializer
        return WarehouseSerializer

    def _sync_province(self, instance):
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
        harvest = self.get_object()
        if harvest.status != Harvest.Status.PENDING:
            return Response(
                {"detail": "Only pending harvests can be approved."}, status=400
            )
        if not harvest.unit_price or harvest.grade is None or harvest.quality_check is None:
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
        harvest = self.get_object()
        if harvest.status != Harvest.Status.VERIFIED:
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
            Warehouse.objects.filter(pk=harvest.warehouse_id).update(
                current_stock=harvest.warehouse.current_stock + harvest.quantity_kg
            )

        log_audit(request.user, "collect_harvest", "farmers", f"Harvest #{harvest.id}")
        return Response(OfficerHarvestSerializer(harvest).data)


class OfficerDashboardView(APIView):
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
            }
        )


class OfficerReportsView(APIView):
    permission_classes = [HasPermission("generate_reports")]

    def get(self, request):
        warehouses = Warehouse.objects.select_related("district", "province").order_by("name")
        stock_report = WarehouseSerializer(warehouses, many=True).data

        transactions = Harvest.objects.select_related(
            "farmer", "paddy_type", "warehouse"
        ).prefetch_related("payments").filter(
            status__in=[Harvest.Status.VERIFIED, Harvest.Status.COLLECTED]
        ).order_by("-harvest_date")[:100]

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

        return Response(
            {
                "stock_report": stock_report,
                "transaction_report": transaction_report,
            }
        )
