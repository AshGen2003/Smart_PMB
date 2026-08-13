# Serializers for the purchases app. Follows the same "read serializer
# nests human-readable names, write serializer accepts plain foreign-key
# ids" pattern used in mills/serializers.py and farmers/serializers.py.
from rest_framework import serializers

from .models import AuthorizedPurchaser, DispatchManifest, FarmGatePurchase, PurchaserStock, RiceRequest


def _delivery_status(obj):
    """
    Shared by RiceRequestSerializer/DispatchManifestSerializer-style
    self-service serializers: the requester's own view of whichever
    Delivery (see farmers.Delivery) is transporting their request, or None
    if an officer hasn't scheduled one yet. At most one is ever linked, so
    `.first()` is safe.
    """
    delivery = obj.deliveries.select_related("driver", "vehicle").first()
    if not delivery:
        return None
    return {
        "status": delivery.status,
        "assignment_status": delivery.assignment_status,
        "driver_name": delivery.driver.full_name,
        "vehicle_registration": delivery.vehicle.registration_no,
        "scheduled_date": delivery.scheduled_date,
    }


class AuthorizedPurchaserSerializer(serializers.ModelSerializer):
    """Read representation of an AuthorizedPurchaser profile, with the district name resolved for display."""

    district_name = serializers.CharField(source="district.name", default=None)

    class Meta:
        model = AuthorizedPurchaser
        fields = [
            "id", "organization", "reg_number", "district", "district_name", "phone",
            "authorized_date", "weight_limit_kg", "advance_amount",
        ]


class OfficerAuthorizedPurchaserWriteSerializer(serializers.ModelSerializer):
    """Officer-only update of a purchaser's buying weight limit and government advance."""

    class Meta:
        model = AuthorizedPurchaser
        fields = ["weight_limit_kg", "advance_amount"]


class RiceRequestSerializer(serializers.ModelSerializer):
    """Read representation of a RiceRequest, for a purchaser viewing their own requests."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    delivery = serializers.SerializerMethodField()

    class Meta:
        model = RiceRequest
        fields = [
            "id", "paddy_type", "paddy_type_name", "quantity_kg", "status",
            "requested_date", "review_notes", "delivery",
        ]

    def get_delivery(self, obj):
        return _delivery_status(obj)


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
    has_delivery = serializers.SerializerMethodField()

    class Meta:
        model = RiceRequest
        fields = [
            "id", "purchaser", "purchaser_name", "paddy_type", "paddy_type_name",
            "quantity_kg", "status", "requested_date", "reviewed_by_name",
            "fulfilled_from_warehouse", "review_notes", "has_delivery",
        ]

    def get_has_delivery(self, obj):
        return obj.deliveries.exists()


class PurchaserStockSerializer(serializers.ModelSerializer):
    """Read representation of a purchaser's stock-on-hand for a single paddy type."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = PurchaserStock
        fields = ["id", "paddy_type", "paddy_type_name", "quantity_kg"]


class FarmerNicLookupSerializer(serializers.Serializer):
    """
    Narrow, purchaser-scoped farmer lookup result for the farm-gate buying
    terminal — deliberately not FarmerOptionSerializer/FarmerListView
    (officer-only, unfiltered, no quota shown). `quota` is computed by the
    view (farmers.views._current_season_channel_totals_kg) and passed in via
    context, not a model field.
    """

    id = serializers.IntegerField()
    name = serializers.CharField()
    registration_no = serializers.CharField()
    reliability_score = serializers.FloatField()
    quota = serializers.SerializerMethodField()

    def get_quota(self, obj):
        return self.context.get("quota")


class FarmGatePurchaseSerializer(serializers.ModelSerializer):
    """Read representation of a FarmGatePurchase, for a purchaser viewing their own purchase history."""

    farmer_name = serializers.CharField(source="farmer.name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = FarmGatePurchase
        fields = [
            "id", "farmer", "farmer_name", "paddy_type", "paddy_type_name",
            "weight_kg", "unit_price", "total_amount", "receipt_no",
            "purchase_date", "manifest",
        ]


class FarmGatePurchaseCreateSerializer(serializers.ModelSerializer):
    """
    Create representation of a FarmGatePurchase (submitted by the
    purchaser). `unit_price`/`total_amount`/`receipt_no`/`purchaser` are set
    server-side in FarmGatePurchaseViewSet.perform_create, which also
    enforces the purchaser's weight limit and the farmer's seasonal quota.
    """

    class Meta:
        model = FarmGatePurchase
        fields = ["id", "farmer", "paddy_type", "weight_kg"]


class OfficerFarmGatePurchaseSerializer(serializers.ModelSerializer):
    """Read-only representation of a FarmGatePurchase for the officer-side audit list."""

    purchaser_name = serializers.CharField(source="purchaser.full_name", default=None)
    farmer_name = serializers.CharField(source="farmer.name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = FarmGatePurchase
        fields = [
            "id", "purchaser", "purchaser_name", "farmer", "farmer_name",
            "paddy_type", "paddy_type_name", "weight_kg", "unit_price",
            "total_amount", "receipt_no", "purchase_date", "manifest",
        ]


class DispatchManifestSerializer(serializers.ModelSerializer):
    """Read representation of a DispatchManifest, for a purchaser viewing their own manifests."""

    destination_warehouse_name = serializers.CharField(source="destination_warehouse.name", default=None)
    purchases = FarmGatePurchaseSerializer(many=True, read_only=True)
    delivery = serializers.SerializerMethodField()

    class Meta:
        model = DispatchManifest
        fields = [
            "id", "destination_warehouse", "destination_warehouse_name",
            "status", "requested_date", "review_notes", "purchases", "delivery",
        ]

    def get_delivery(self, obj):
        return _delivery_status(obj)


class DispatchManifestCreateSerializer(serializers.ModelSerializer):
    """
    Create representation of a DispatchManifest (submitted by the
    purchaser). `purchase_ids` bulk-attaches the purchaser's own
    unassigned FarmGatePurchase rows — see DispatchManifestViewSet.perform_create.
    """

    purchase_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = DispatchManifest
        fields = ["id", "destination_warehouse", "purchase_ids"]


class OfficerDispatchManifestSerializer(serializers.ModelSerializer):
    """Read representation of a DispatchManifest for the officer-side review queue."""

    purchaser_name = serializers.CharField(source="purchaser.full_name", default=None)
    destination_warehouse_name = serializers.CharField(source="destination_warehouse.name", default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", default=None)
    purchases = FarmGatePurchaseSerializer(many=True, read_only=True)
    has_delivery = serializers.SerializerMethodField()

    class Meta:
        model = DispatchManifest
        fields = [
            "id", "purchaser", "purchaser_name", "destination_warehouse",
            "destination_warehouse_name", "status", "requested_date",
            "reviewed_by_name", "review_notes", "purchases", "has_delivery",
        ]

    def get_has_delivery(self, obj):
        return obj.deliveries.exists()
