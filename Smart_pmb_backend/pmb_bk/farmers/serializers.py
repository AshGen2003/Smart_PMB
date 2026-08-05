# Serializers for the farmers app. Most model pairs here follow the same
# "read serializer nests human-readable names, write serializer accepts
# plain foreign-key ids" pattern used throughout the admin/officer APIs.
from decimal import Decimal

from rest_framework import serializers

from .models import (
    Delivery,
    DeliveryLocationPing,
    DeliverySlot,
    District,
    Farmer,
    FuelRecord,
    Harvest,
    Inventory,
    MaintenanceRecord,
    Notification,
    PaddyType,
    Payment,
    PriceRecord,
    Route,
    TransactionLog,
    TransactionVerification,
    Vehicle,
    Warehouse,
)


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


class PriceRecordSerializer(serializers.ModelSerializer):
    """Read representation of one historical guaranteed-price snapshot for a PaddyType."""

    class Meta:
        model = PriceRecord
        fields = ["id", "guaranteed_price", "season", "effective_date"]


class InventorySerializer(serializers.ModelSerializer):
    """Read representation of one warehouse/paddy-type/grade stock line."""

    warehouse_name = serializers.CharField(source="warehouse.name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    updated_by_name = serializers.CharField(source="updated_by.full_name", default=None)

    class Meta:
        model = Inventory
        fields = [
            "id", "warehouse", "warehouse_name", "paddy_type", "paddy_type_name",
            "grade", "quantity", "unit", "minimum_level", "maximum_level",
            "last_updated", "updated_by_name",
        ]


class TransactionLogSerializer(serializers.ModelSerializer):
    """Read representation of one warehouse stock-movement log entry."""

    warehouse_name = serializers.CharField(source="warehouse.name", default=None)

    class Meta:
        model = TransactionLog
        fields = [
            "id", "warehouse", "warehouse_name", "transaction_type",
            "quantity_change", "harvest", "rice_request", "notes", "created_at",
        ]


class TransactionVerificationSerializer(serializers.ModelSerializer):
    """Read representation of one after-the-fact transaction sign-off."""

    verified_by_name = serializers.CharField(source="verified_by.full_name", default=None)

    class Meta:
        model = TransactionVerification
        fields = [
            "id", "harvest", "rice_request", "verified_by_name",
            "verified_at", "status", "notes",
        ]


class TransactionVerificationWriteSerializer(serializers.ModelSerializer):
    """Validates the optional notes/status submitted with a verify action; harvest/rice_request/verified_by are set server-side."""

    class Meta:
        model = TransactionVerification
        fields = ["status", "notes"]


class HarvestSerializer(serializers.ModelSerializer):
    """
    Compact Harvest representation for a farmer's own dashboard. Includes
    the quality-assessment fields (once an officer has recorded them) so a
    farmer can see why a harvest passed/failed the PMB quality standard,
    but not officer-workflow-only fields like grade/unit_price/quality_check.
    """

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    meets_pmb_quality_standard = serializers.BooleanField(read_only=True, allow_null=True)

    class Meta:
        model = Harvest
        fields = [
            "id", "paddy_type_name", "quantity_kg", "harvest_date", "status", "lot_code",
            "moisture_level", "impurity_percent", "empty_grains_percent", "meets_pmb_quality_standard",
            "delivery_slot",
        ]


class FarmerHarvestCreateSerializer(serializers.ModelSerializer):
    """
    Create representation of a Harvest for a farmer submitting their own
    delivery. Deliberately limited to the fields a farmer actually knows at
    submission time — grade/moisture/quality_check/unit_price/warehouse are
    filled in later by an officer during approval, and `status` defaults to
    "pending" on the model. `delivery_slot` is optional, linking this
    harvest back to a prior DeliverySlot booking for traceability only.
    """

    class Meta:
        model = Harvest
        fields = ["id", "paddy_type", "quantity_kg", "delivery_slot"]

    def validate_delivery_slot(self, value):
        if value is not None and value.farmer.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("You can only link your own delivery slot bookings.")
        return value


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


class FarmerBankDetailsSerializer(serializers.ModelSerializer):
    """Self-service read/update of the logged-in farmer's own bank details (payout account)."""

    class Meta:
        model = Farmer
        fields = ["bank_account", "bank_name", "bank_branch"]


class WarehouseSerializer(serializers.ModelSerializer):
    """Read representation of a Warehouse, with district/province/manager names resolved for display."""

    district_name = serializers.CharField(source="district.name", default=None)
    province_name = serializers.CharField(source="province.name", default=None)
    managed_by_name = serializers.CharField(source="managed_by.full_name", default=None)
    utilization_pct = serializers.SerializerMethodField()
    remaining_capacity = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            "id", "name", "code", "capacity", "current_stock", "status",
            "contact_number", "established_date", "district", "district_name",
            "province", "province_name", "location", "managed_by", "managed_by_name",
            "utilization_pct", "remaining_capacity",
        ]

    def get_utilization_pct(self, obj):
        if not obj.capacity:
            return 0
        return round(float(obj.current_stock) / float(obj.capacity) * 100, 1)

    def get_remaining_capacity(self, obj):
        return obj.capacity - obj.current_stock


class WarehouseWriteSerializer(serializers.ModelSerializer):
    """
    Create/update representation of a Warehouse. Deliberately excludes
    `current_stock` (only ever changed by the harvest-collection workflow
    or WarehouseViewSet.adjust_stock, never edited directly) and `province`
    (derived from `district` by WarehouseViewSet._sync_province in views.py).
    """

    class Meta:
        model = Warehouse
        fields = [
            "id", "name", "code", "capacity", "status", "contact_number",
            "established_date", "district", "location", "managed_by",
        ]


class WarehouseManagerSelfUpdateSerializer(serializers.ModelSerializer):
    """
    Self-service update for a warehouse_manager editing their own
    warehouse's operational info — deliberately limited to `contact_number`
    and `status` (e.g. flipping to "under_maintenance" themselves). Every
    structural field (capacity/code/district/location/managed_by) stays
    editable only via WarehouseWriteSerializer (officer/admin, "manage_warehouses").
    """

    class Meta:
        model = Warehouse
        fields = ["contact_number", "status"]


class WarehouseStockAdjustmentSerializer(serializers.Serializer):
    """
    Write-only payload for WarehouseViewSet.adjust_stock — a manual
    add/remove of stock for one paddy type (and optional grade) at a
    warehouse, independent of the harvest-collection/rice-request-fulfillment
    flows. `direction` picks the sign applied to `quantity` before it's
    passed to _log_transaction/Warehouse.current_stock.
    """

    paddy_type = serializers.PrimaryKeyRelatedField(queryset=PaddyType.objects.all())
    grade = serializers.ChoiceField(choices=Harvest.Grade.choices, required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    direction = serializers.ChoiceField(choices=["add", "remove"])
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class OfficerHarvestSerializer(serializers.ModelSerializer):
    """Full Harvest representation for officers, with farmer/paddy-type/warehouse names resolved for display."""

    farmer_name = serializers.CharField(source="farmer.name", default=None)
    farmer_reliability_score = serializers.FloatField(source="farmer.reliability_score", default=None, read_only=True)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    warehouse_name = serializers.CharField(source="warehouse.name", default=None)
    processed_by_name = serializers.CharField(source="processed_by.full_name", default=None)
    meets_pmb_quality_standard = serializers.BooleanField(read_only=True, allow_null=True)

    class Meta:
        model = Harvest
        fields = [
            "id", "farmer", "farmer_name", "farmer_reliability_score", "paddy_type", "paddy_type_name",
            "warehouse", "warehouse_name", "quantity_kg", "harvest_date",
            "purchase_date", "grade", "moisture_level", "impurity_percent", "empty_grains_percent",
            "meets_pmb_quality_standard", "quality_check",
            "unit_price", "status", "processed_by_name", "lot_code",
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
            "purchase_date", "grade", "moisture_level", "impurity_percent",
            "empty_grains_percent", "quality_check", "unit_price",
        ]


class VehicleSerializer(serializers.ModelSerializer):
    """Read/write representation of a Vehicle (same fields both ways — no derived/read-only extras)."""

    class Meta:
        model = Vehicle
        fields = ["id", "registration_no", "vehicle_type", "model", "manufacture_year", "size", "capacity_kg", "status"]


class RouteSerializer(serializers.ModelSerializer):
    """Read/write representation of a Route."""

    class Meta:
        model = Route
        fields = ["id", "origin", "destination", "distance_km", "estimated_time"]


class DeliverySerializer(serializers.ModelSerializer):
    """Read representation of a Delivery, with vehicle/driver/route/warehouse names resolved for display."""

    vehicle_registration = serializers.CharField(source="vehicle.registration_no", default=None)
    driver_name = serializers.CharField(source="driver.full_name", default=None)
    route_label = serializers.SerializerMethodField()
    warehouse_name = serializers.CharField(source="warehouse.name", default=None)
    approved_by_name = serializers.CharField(source="approved_by.full_name", default=None)
    latest_location = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = [
            "id", "vehicle", "vehicle_registration", "driver", "driver_name",
            "route", "route_label", "warehouse", "warehouse_name",
            "approved_by", "approved_by_name", "dispatch_manifest",
            "milling_return_request", "scheduled_date", "status",
            "assignment_status", "latest_location",
        ]

    def get_route_label(self, obj):
        return f"{obj.route.origin} → {obj.route.destination}" if obj.route_id else None

    def get_latest_location(self, obj):
        ping = obj.location_pings.first()  # Meta.ordering = ["-recorded_at"]
        if not ping:
            return None
        return {
            "latitude": float(ping.latitude),
            "longitude": float(ping.longitude),
            "recorded_at": ping.recorded_at,
        }


class DeliveryLocationPingSerializer(serializers.ModelSerializer):
    """Write-only: a single GPS reading the driver's browser reports while a delivery is in transit."""

    class Meta:
        model = DeliveryLocationPing
        fields = ["id", "latitude", "longitude", "recorded_at"]
        read_only_fields = ["id", "recorded_at"]


class DeliveryWriteSerializer(serializers.ModelSerializer):
    """
    Create/update representation of a Delivery. `status` is writable here
    too (unlike Harvest) since deliveries don't have the same
    approve/reject/collect gating workflow — an officer can move a
    delivery through scheduled/in_transit/delivered/delayed/cancelled
    directly, or via the `update_status` action for a lighter-weight call.
    """

    class Meta:
        model = Delivery
        fields = [
            "id", "vehicle", "driver", "route", "warehouse",
            "dispatch_manifest", "milling_return_request",
            "scheduled_date", "status",
        ]


class FuelRecordSerializer(serializers.ModelSerializer):
    """
    Read/write representation of a FuelRecord, with the vehicle's
    registration resolved for display. `vehicle_registration` must stay
    read_only: it shares this one serializer between read and write (no
    separate write serializer, unlike Delivery/Warehouse/Harvest), and a
    writable dotted-source field here collides with the plain `vehicle` FK
    field during deserialization (both try to write into the same nested
    `vehicle` slot in the input dict — DRF raises "'Vehicle' object does
    not support item assignment").
    """

    vehicle_registration = serializers.CharField(source="vehicle.registration_no", read_only=True, default=None)

    class Meta:
        model = FuelRecord
        fields = [
            "id", "vehicle", "vehicle_registration", "fuel_type",
            "quantity_litres", "cost", "fuel_date",
        ]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    """Read/write representation of a MaintenanceRecord, with the vehicle's registration resolved for display. See FuelRecordSerializer's docstring for why `vehicle_registration` must stay read_only."""

    vehicle_registration = serializers.CharField(source="vehicle.registration_no", read_only=True, default=None)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "id", "vehicle", "vehicle_registration", "service_date",
            "description", "cost", "next_service_date",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """Read representation of a Payment, for a farmer viewing their own itemized payment history."""

    class Meta:
        model = Payment
        fields = [
            "id", "harvest", "amount", "status", "payment_date", "method",
            "disbursement_reference", "disbursed_date",
        ]


class OfficerPaymentSerializer(serializers.ModelSerializer):
    """Read representation of a Payment for the officer-side payments list, with farmer details resolved for display."""

    farmer_name = serializers.CharField(source="farmer.name", default=None)
    farmer_registration_no = serializers.CharField(source="farmer.registration_no", default=None)

    class Meta:
        model = Payment
        fields = [
            "id", "harvest", "farmer", "farmer_name", "farmer_registration_no",
            "amount", "status", "payment_date", "method",
            "disbursement_reference", "disbursed_date",
        ]


class DeliverySlotSerializer(serializers.ModelSerializer):
    """Read representation of a DeliverySlot, for a farmer viewing their own bookings."""

    warehouse_name = serializers.CharField(source="warehouse.name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = DeliverySlot
        fields = [
            "id", "warehouse", "warehouse_name", "paddy_type", "paddy_type_name",
            "estimated_quantity_kg", "scheduled_date", "status", "booking_reference",
            "checked_in_at",
        ]


class DeliverySlotCreateSerializer(serializers.ModelSerializer):
    """Create representation of a DeliverySlot (submitted by the farmer). booking_reference/farmer/status are set server-side."""

    class Meta:
        model = DeliverySlot
        fields = ["id", "warehouse", "paddy_type", "estimated_quantity_kg", "scheduled_date"]

    def validate_scheduled_date(self, value):
        from django.utils import timezone
        if value < timezone.now().date():
            raise serializers.ValidationError("Scheduled date can't be in the past.")
        return value


class WarehouseManagerDeliverySlotSerializer(serializers.ModelSerializer):
    """
    Read representation of a DeliverySlot for the warehouse manager's
    check-in screen. Includes the farmer's name -- unlike the public
    harvest-trace endpoint, this is not public; the manager is verifying an
    in-person arrival and genuinely needs to identify who they're talking to.
    """

    farmer_name = serializers.CharField(source="farmer.name", default=None)
    farmer_registration_no = serializers.CharField(source="farmer.registration_no", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = DeliverySlot
        fields = [
            "id", "farmer_name", "farmer_registration_no", "paddy_type_name",
            "estimated_quantity_kg", "scheduled_date", "status", "booking_reference",
            "checked_in_at",
        ]
