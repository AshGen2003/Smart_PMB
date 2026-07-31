from rest_framework import serializers

from .models import Delivery


class DeliveryListSerializer(serializers.ModelSerializer):
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = Delivery
        fields = [
            "delivery_id", "purchase_id", "warehouse_id", "warehouse_name",
            "quantity_kg", "vehicle_number", "driver_name", "pickup_location",
            "drop_location", "status", "delivery_date",
        ]


class DeliveryCreateSerializer(serializers.ModelSerializer):
    warehouse_id = serializers.IntegerField()
    purchase_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Delivery
        fields = [
            "purchase_id", "warehouse_id", "quantity_kg", "vehicle_number",
            "driver_name", "pickup_location", "drop_location",
        ]
