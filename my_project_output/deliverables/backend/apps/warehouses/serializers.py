from rest_framework import serializers
from .models import Warehouse


class WarehouseListSerializer(serializers.ModelSerializer):
    utilization_pct = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            "warehouse_id", "name", "district", "location",
            "capacity_kg", "current_stock_kg", "status", "utilization_pct",
        ]

    def get_utilization_pct(self, obj):
        return obj.utilization_pct


class WarehouseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "name", "district", "location", "capacity_kg", "status",
        ]

    def validate_capacity_kg(self, value):
        if float(value) <= 0:
            raise serializers.ValidationError("Capacity must be positive")
        return value


class WarehouseAlertSerializer(serializers.ModelSerializer):
    utilization_pct = serializers.SerializerMethodField()
    alert_level = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            "warehouse_id", "name", "district", "location",
            "capacity_kg", "current_stock_kg", "status",
            "utilization_pct", "alert_level",
        ]

    def get_utilization_pct(self, obj):
        return obj.utilization_pct

    def get_alert_level(self, obj):
        pct = obj.utilization_pct
        if pct >= 85:
            return "high"
        if pct <= 20:
            return "low"
        return "normal"
