"""Serializers for the Logistics Module API."""
from rest_framework import serializers

from .models import (
    Delivery,
    Driver,
    FuelRecord,
    GpsTracking,
    MaintenanceRecord,
    Route,
    Vehicle,
)


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ["vehicle_id", "registration_no", "vehicle_type", "capacity", "status"]
        read_only_fields = ["vehicle_id"]


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ["driver_id", "name", "license_no", "contact_no", "address", "status"]
        read_only_fields = ["driver_id"]


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ["route_id", "origin", "destination", "distance", "estimated_time"]
        read_only_fields = ["route_id"]


class DeliverySerializer(serializers.ModelSerializer):
    # Lightweight nested read-only representations of the related logistics rows.
    vehicle_registration = serializers.CharField(source="vehicle.registration_no", read_only=True)
    driver_name = serializers.CharField(source="driver.name", read_only=True)
    route_label = serializers.SerializerMethodField(read_only=True)
    warehouse_name = serializers.SerializerMethodField(read_only=True)
    purchase_number = serializers.SerializerMethodField(read_only=True)
    approved_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Delivery
        fields = [
            "delivery_id",
            "vehicle",
            "driver",
            "route",
            "purchase",
            "warehouse",
            "approved_by",
            "scheduled_date",
            "delivery_status",
            # read-only helpers
            "vehicle_registration",
            "driver_name",
            "route_label",
            "warehouse_name",
            "purchase_number",
            "approved_by_name",
        ]
        read_only_fields = ["delivery_id"]

    def get_route_label(self, obj):
        try:
            return f"{obj.route.origin} → {obj.route.destination}"
        except Exception:
            return None

    def get_warehouse_name(self, obj):
        try:
            return obj.warehouse.name if obj.warehouse_id else None
        except Exception:
            return None

    def get_purchase_number(self, obj):
        try:
            return obj.purchase.purchase_number if obj.purchase_id else None
        except Exception:
            return None

    def get_approved_by_name(self, obj):
        try:
            return obj.approved_by.name if obj.approved_by_id else None
        except Exception:
            return None


class FuelRecordSerializer(serializers.ModelSerializer):
    vehicle_registration = serializers.CharField(source="vehicle.registration_no", read_only=True)

    class Meta:
        model = FuelRecord
        fields = [
            "fuel_id",
            "vehicle",
            "fuel_type",
            "quantity",
            "cost",
            "fuel_date",
            "vehicle_registration",
        ]
        read_only_fields = ["fuel_id"]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicle_registration = serializers.CharField(source="vehicle.registration_no", read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "maintenance_id",
            "vehicle",
            "service_date",
            "description",
            "cost",
            "next_service_date",
            "vehicle_registration",
        ]
        read_only_fields = ["maintenance_id"]


class GpsTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GpsTracking
        fields = ["tracking_id", "delivery", "latitude", "longitude", "timestamp"]
        read_only_fields = ["tracking_id"]
