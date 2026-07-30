from rest_framework import serializers

from .models import Purchase


class PurchaseListSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source="farmer_name")
    warehouse_name = serializers.CharField(source="warehouse.name")
    warehouse_id = serializers.IntegerField(source="warehouse.warehouse_id")

    class Meta:
        model = Purchase
        fields = [
            "purchase_id", "farmer_name", "paddy_type", "quantity_kg",
            "amount_lkr", "payment_status", "warehouse_name",
            "warehouse_id", "purchase_date",
        ]


class PurchaseCreateSerializer(serializers.Serializer):
    farmer_name = serializers.CharField(max_length=150, min_length=2)
    warehouse_id = serializers.IntegerField()
    paddy_type = serializers.CharField(max_length=50, min_length=2)
    quantity_kg = serializers.FloatField(min_value=0.001)
    amount_lkr = serializers.FloatField(min_value=0)
    payment_status = serializers.ChoiceField(
        choices=["PENDING", "COMPLETED", "FAILED"],
        default="PENDING",
        required=False,
    )
