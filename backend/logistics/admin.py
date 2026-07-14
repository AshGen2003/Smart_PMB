from django.contrib import admin

from .models import (
    Delivery,
    Driver,
    FuelRecord,
    GpsTracking,
    MaintenanceRecord,
    Route,
    Vehicle,
)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("registration_no", "vehicle_type", "capacity", "status")
    list_filter = ("status", "vehicle_type")
    search_fields = ("registration_no",)


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("name", "license_no", "contact_no", "status")
    list_filter = ("status",)
    search_fields = ("name", "license_no")


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ("origin", "destination", "distance", "estimated_time")
    search_fields = ("origin", "destination")


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("delivery_id", "vehicle", "driver", "route", "scheduled_date", "delivery_status")
    list_filter = ("delivery_status",)
    search_fields = ("delivery_id",)


@admin.register(FuelRecord)
class FuelRecordAdmin(admin.ModelAdmin):
    list_display = ("fuel_id", "vehicle", "fuel_type", "quantity", "cost", "fuel_date")
    list_filter = ("fuel_type",)


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = ("maintenance_id", "vehicle", "service_date", "cost", "next_service_date")


@admin.register(GpsTracking)
class GpsTrackingAdmin(admin.ModelAdmin):
    list_display = ("tracking_id", "delivery", "latitude", "longitude", "timestamp")
