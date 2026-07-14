"""Views for the Logistics Module API."""
from django.db.models import Count, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Delivery, Driver, FuelRecord, GpsTracking, MaintenanceRecord, Route, Vehicle
from .serializers import (
    DeliverySerializer,
    DriverSerializer,
    FuelRecordSerializer,
    GpsTrackingSerializer,
    MaintenanceRecordSerializer,
    RouteSerializer,
    VehicleSerializer,
)


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filterset_fields = ["status", "vehicle_type"]
    search_fields = ["registration_no"]


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filterset_fields = ["status"]
    search_fields = ["name", "license_no", "contact_no"]


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer
    search_fields = ["origin", "destination"]


class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.select_related("vehicle", "driver", "route").all()
    serializer_class = DeliverySerializer
    filterset_fields = ["delivery_status", "vehicle", "driver", "route"]

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get("delivery_status")
        valid = [c[0] for c in Delivery.STATUS_CHOICES]
        if new_status not in valid:
            return Response(
                {"detail": f"Invalid status. Choose from {valid}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delivery.delivery_status = new_status
        delivery.save()
        return Response(self.get_serializer(delivery).data)


class FuelRecordViewSet(viewsets.ModelViewSet):
    queryset = FuelRecord.objects.select_related("vehicle").all()
    serializer_class = FuelRecordSerializer
    filterset_fields = ["vehicle", "fuel_type"]


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related("vehicle").all()
    serializer_class = MaintenanceRecordSerializer
    filterset_fields = ["vehicle"]


class GpsTrackingViewSet(viewsets.ModelViewSet):
    queryset = GpsTracking.objects.select_related("delivery").all()
    serializer_class = GpsTrackingSerializer
    filterset_fields = ["delivery"]


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
            }
        )


class DashboardView(viewsets.ViewSet):
    """Aggregated analytics for the logistics dashboard."""

    def list(self, request):
        vehicles = Vehicle.objects
        drivers = Driver.objects
        deliveries = Delivery.objects

        deliveries_by_status = (
            deliveries.values("delivery_status")
            .annotate(count=Count("delivery_id"))
            .order_by("delivery_status")
        )
        vehicle_status = (
            vehicles.values("status").annotate(count=Count("vehicle_id")).order_by("status")
        )
        driver_status = (
            drivers.values("status").annotate(count=Count("driver_id")).order_by("status")
        )

        fuel_cost = FuelRecord.objects.aggregate(total=Sum("cost"))["total"] or 0
        maintenance_cost = MaintenanceRecord.objects.aggregate(total=Sum("cost"))["total"] or 0

        recent_deliveries = DeliverySerializer(
            deliveries.select_related("vehicle", "driver", "route").order_by(
                "-scheduled_date"
            )[:8],
            many=True,
        ).data

        active_vehicles = vehicles.filter(status="active").count()
        in_transit = deliveries.filter(delivery_status="in_transit").count()
        scheduled = deliveries.filter(delivery_status="scheduled").count()
        delivered = deliveries.filter(delivery_status="delivered").count()

        data = {
            "counts": {
                "vehicles": vehicles.count(),
                "active_vehicles": active_vehicles,
                "drivers": drivers.count(),
                "available_drivers": drivers.filter(status="available").count(),
                "routes": Route.objects.count(),
                "deliveries": deliveries.count(),
                "in_transit": in_transit,
                "scheduled": scheduled,
                "delivered": delivered,
                "fuel_records": FuelRecord.objects.count(),
                "maintenance_records": MaintenanceRecord.objects.count(),
                "gps_points": GpsTracking.objects.count(),
            },
            "deliveries_by_status": list(deliveries_by_status),
            "vehicle_status": list(vehicle_status),
            "driver_status": list(driver_status),
            "cost_summary": {
                "fuel_cost_total": round(float(fuel_cost), 2),
                "maintenance_cost_total": round(float(maintenance_cost), 2),
            },
            "recent_deliveries": recent_deliveries,
        }
        return Response(data)
