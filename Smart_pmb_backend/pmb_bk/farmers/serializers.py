# Serializers for the farmers app. Most model pairs here follow the same
# "read serializer nests human-readable names, write serializer accepts
# plain foreign-key ids" pattern used throughout the admin/officer APIs.
from rest_framework import serializers

from .models import District, Farmer, Harvest, Notification, PaddyType, Warehouse


class ProvinceNameSerializer(serializers.Serializer):
    """Minimal inline representation of a Province (just its name) for nesting inside DistrictSerializer."""

    name = serializers.CharField()


class DistrictSerializer(serializers.ModelSerializer):
    """District with its parent Province's name nested in, for the public registration dropdown."""

    province = ProvinceNameSerializer(read_only=True)

    class Meta:
        model = District
        fields = ["id", "name", "province"]


class PaddyTypeSerializer(serializers.ModelSerializer):
    """Read representation of a PaddyType."""

    class Meta:
        model = PaddyType
        fields = ["id", "type_name", "variety", "description", "guaranteed_price", "is_active"]


class PaddyTypeWriteSerializer(serializers.ModelSerializer):
    """Create/update representation of a PaddyType (same fields as the read serializer here)."""

    class Meta:
        model = PaddyType
        fields = ["id", "type_name", "variety", "description", "guaranteed_price", "is_active"]


class HarvestSerializer(serializers.ModelSerializer):
    """Compact Harvest representation for a farmer's own dashboard (no officer-only assessment fields)."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = Harvest
        fields = ["id", "paddy_type_name", "quantity_kg", "harvest_date", "status"]


class NotificationSerializer(serializers.ModelSerializer):
    """Read representation of a farmer's Notification."""

    class Meta:
        model = Notification
        fields = ["id", "message", "sent_at", "is_read"]


class FarmerOptionSerializer(serializers.ModelSerializer):
    """Minimal Farmer representation used to populate a farmer-picker dropdown when officers record a purchase."""

    class Meta:
        model = Farmer
        fields = ["id", "name", "registration_no"]


class WarehouseSerializer(serializers.ModelSerializer):
    """Read representation of a Warehouse, with district/province names resolved for display."""

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
    """
    Create/update representation of a Warehouse. Deliberately excludes
    `current_stock` (only ever changed by the harvest-collection workflow,
    never edited directly) and `province` (derived from `district` by
    WarehouseViewSet._sync_province in views.py).
    """

    class Meta:
        model = Warehouse
        fields = [
            "id", "name", "code", "capacity", "status", "contact_number",
            "established_date", "district", "location",
        ]


class OfficerHarvestSerializer(serializers.ModelSerializer):
    """Full Harvest representation for officers, with farmer/paddy-type/warehouse names resolved for display."""

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
    """
    Create/update representation of a Harvest for officers. `status` is
    intentionally not writable here — status changes only happen through
    the approve/reject/collect actions on OfficerHarvestViewSet, which
    enforce the workflow's valid transitions.
    """

    class Meta:
        model = Harvest
        fields = [
            "id", "farmer", "paddy_type", "warehouse", "quantity_kg",
            "purchase_date", "grade", "moisture_level", "quality_check",
            "unit_price",
        ]
