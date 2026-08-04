# Serializers for the purchases app. Follows the same "read serializer
# nests human-readable names, write serializer accepts plain foreign-key
# ids" pattern used in mills/serializers.py and farmers/serializers.py.
from rest_framework import serializers

from .models import AuthorizedPurchaser, PurchaserStock, RiceRequest


class AuthorizedPurchaserSerializer(serializers.ModelSerializer):
    """Read representation of an AuthorizedPurchaser profile, with the district name resolved for display."""

    district_name = serializers.CharField(source="district.name", default=None)

    class Meta:
        model = AuthorizedPurchaser
        fields = ["id", "organization", "reg_number", "district", "district_name", "phone", "authorized_date"]


class RiceRequestSerializer(serializers.ModelSerializer):
    """Read representation of a RiceRequest, for a purchaser viewing their own requests."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = RiceRequest
        fields = [
            "id", "paddy_type", "paddy_type_name", "quantity_kg", "status",
            "requested_date", "review_notes",
        ]


class RiceRequestWriteSerializer(serializers.ModelSerializer):
    """Create representation of a RiceRequest (submitted by the purchaser); purchaser/status are set server-side."""

    class Meta:
        model = RiceRequest
        fields = ["id", "paddy_type", "quantity_kg"]


class OfficerRiceRequestSerializer(serializers.ModelSerializer):
    """Read representation of a RiceRequest for the officer-side review queue, with the requester's details nested in."""

    purchaser_name = serializers.CharField(source="purchaser.full_name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", default=None)

    class Meta:
        model = RiceRequest
        fields = [
            "id", "purchaser", "purchaser_name", "paddy_type", "paddy_type_name",
            "quantity_kg", "status", "requested_date", "reviewed_by_name",
            "fulfilled_from_warehouse", "review_notes",
        ]


class PurchaserStockSerializer(serializers.ModelSerializer):
    """Read representation of a purchaser's stock-on-hand for a single paddy type."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = PurchaserStock
        fields = ["id", "paddy_type", "paddy_type_name", "quantity_kg"]
