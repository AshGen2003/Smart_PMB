from rest_framework import serializers

from .models import District, Farmer, Harvest, Notification, PaddyType, Warehouse


class ProvinceNameSerializer(serializers.Serializer):
    name = serializers.CharField()


class DistrictSerializer(serializers.ModelSerializer):
    province = ProvinceNameSerializer(read_only=True)

    class Meta:
        model = District
        fields = ["id", "name", "province"]


class PaddyTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaddyType
        fields = ["id", "type_name", "variety", "description", "guaranteed_price", "is_active"]


class PaddyTypeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaddyType
        fields = ["id", "type_name", "variety", "description", "guaranteed_price", "is_active"]


class HarvestSerializer(serializers.ModelSerializer):
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = Harvest
        fields = ["id", "paddy_type_name", "quantity_kg", "harvest_date", "status"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "message", "sent_at", "is_read"]


class FarmerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farmer
        fields = ["id", "name", "registration_no"]


class WarehouseSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source="district.name", default=None)
    province_name = serializers.CharField(source="province.name", default=None)

    class Meta:
        model = Warehouse
        fields = [
            "id", "name", "code", "capacity", "current_stock", "status",
            "contact_number", "established_date", "district", "district_name",
            "province", "province_name", "location",
        ]


class WarehouseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "id", "name", "code", "capacity", "status", "contact_number",
            "established_date", "district", "location",
        ]


class OfficerHarvestSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source="farmer.name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    warehouse_name = serializers.CharField(source="warehouse.name", default=None)

    class Meta:
        model = Harvest
        fields = [
            "id", "farmer", "farmer_name", "paddy_type", "paddy_type_name",
            "warehouse", "warehouse_name", "quantity_kg", "harvest_date",
            "purchase_date", "grade", "moisture_level", "quality_check",
            "unit_price", "status",
        ]


class OfficerHarvestWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Harvest
        fields = [
            "id", "farmer", "paddy_type", "warehouse", "quantity_kg",
            "purchase_date", "grade", "moisture_level", "quality_check",
            "unit_price",
        ]
