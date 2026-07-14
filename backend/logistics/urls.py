from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CurrentUserView,
    DashboardView,
    DeliveryViewSet,
    DriverViewSet,
    FuelRecordViewSet,
    GpsTrackingViewSet,
    MaintenanceRecordViewSet,
    RouteViewSet,
    VehicleViewSet,
)

router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"drivers", DriverViewSet, basename="driver")
router.register(r"routes", RouteViewSet, basename="route")
router.register(r"deliveries", DeliveryViewSet, basename="delivery")
router.register(r"fuel-records", FuelRecordViewSet, basename="fuelrecord")
router.register(r"maintenance-records", MaintenanceRecordViewSet, basename="maintenancerecord")
router.register(r"gps-tracking", GpsTrackingViewSet, basename="gpstracking")

# Dashboard is a single endpoint exposed at /api/dashboard/
dashboard_list = DashboardView.as_view({"get": "list"})

app_name = "logistics"

urlpatterns = [
    path("auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("dashboard/", dashboard_list, name="dashboard"),
    path("", include(router.urls)),
]
