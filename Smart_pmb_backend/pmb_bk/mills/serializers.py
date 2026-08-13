# Serializers for the mills app. Follows the same "read serializer nests
# human-readable names, write serializer accepts plain foreign-key ids"
# pattern used in farmers/serializers.py.
from rest_framework import serializers

from .models import (
    Inspection,
    License,
    Mill,
    MillingAllocation,
    MillingReport,
    MillingReturnRequest,
    MillStock,
)


def _delivery_status(obj):
    """
    Shared by MillingAllocationSerializer-style self-service serializers:
    the requester's own view of whichever Delivery (see farmers.Delivery)
    is transporting their request, or None if an officer hasn't scheduled
    one yet. At most one is ever linked (see
    farmers.DeliveryWriteSerializer.validate), so `.first()` is safe.
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


class MillSerializer(serializers.ModelSerializer):
    """Read representation of a Mill, with district/province names resolved for display."""

    district_name = serializers.CharField(source="district.name", default=None)
    province_name = serializers.CharField(source="province.name", default=None)

    class Meta:
        model = Mill
        fields = [
            "id", "registration_no", "mill_name", "owner_name", "nic",
            "business_reg_no", "location", "district", "district_name",
            "province", "province_name", "capacity_mt_per_day",
            "contact_number", "registered_date", "status",
        ]


class MillWriteSerializer(serializers.ModelSerializer):
    """
    Update representation of a Mill for the owner's own "update mill
    details" self-service edit. Deliberately excludes `registration_no`,
    `nic`, `owner_name`, and `status` — identity/compliance fields set at
    registration time, not self-editable afterwards.
    """

    class Meta:
        model = Mill
        fields = ["mill_name", "business_reg_no", "location", "district", "capacity_mt_per_day", "contact_number"]

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # `province` is derived from `district` rather than set directly by
        # the client, mirroring WarehouseViewSet._sync_province in
        # farmers/views.py.
        instance.province_id = instance.district.province_id if instance.district_id else None
        instance.save(update_fields=["province"])
        return instance


class LicenseSerializer(serializers.ModelSerializer):
    """Read representation of a License, for a mill owner viewing their own applications."""

    class Meta:
        model = License
        fields = [
            "id", "license_no", "status", "applied_date", "issued_date",
            "expiry_date", "review_notes", "renewed_from",
            "requested_capacity_mt_per_day", "milling_type", "premises_address",
            "justification", "contact_number",
        ]


class LicenseCreateSerializer(serializers.ModelSerializer):
    """
    Create representation for a mill owner applying for a new license or
    renewing an existing one (pass `renewed_from`) — the full set of
    details an officer needs to review before issuing a license, not just
    a bare request.
    """

    class Meta:
        model = License
        fields = [
            "id", "renewed_from", "requested_capacity_mt_per_day",
            "milling_type", "premises_address", "justification", "contact_number",
        ]

    def validate_renewed_from(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if request and value.mill.user_id != request.user.id:
            raise serializers.ValidationError("You can only renew your own mill's license.")
        if value.status != License.Status.APPROVED:
            raise serializers.ValidationError("Only an approved license can be renewed.")
        return value


class OfficerLicenseSerializer(serializers.ModelSerializer):
    """Read representation of a License for the officer-side review queue, with the applicant mill's details nested in."""

    mill_name = serializers.CharField(source="mill.mill_name", default=None)
    mill_registration_no = serializers.CharField(source="mill.registration_no", default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", default=None)

    class Meta:
        model = License
        fields = [
            "id", "mill", "mill_name", "mill_registration_no", "license_no",
            "status", "applied_date", "issued_date", "expiry_date",
            "reviewed_by_name", "review_notes", "renewed_from",
            "requested_capacity_mt_per_day", "milling_type", "premises_address",
            "justification", "contact_number",
        ]


class MillingReportSerializer(serializers.ModelSerializer):
    """Read representation of a MillingReport, with the linked harvest/paddy type resolved for display."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = MillingReport
        fields = [
            "id", "report_date", "paddy_processed_kg", "rice_output_kg",
            "husk_kg", "bran_kg", "notes", "harvest", "allocation", "paddy_type", "paddy_type_name",
        ]


class MillingReportWriteSerializer(serializers.ModelSerializer):
    """Create representation of a MillingReport (submitted by the mill owner). harvest/allocation/paddy_type/husk_kg/bran_kg are optional — see MillingReport's docstring."""

    class Meta:
        model = MillingReport
        fields = [
            "id", "paddy_processed_kg", "rice_output_kg", "husk_kg", "bran_kg",
            "notes", "harvest", "allocation", "paddy_type",
        ]


class InspectionSerializer(serializers.ModelSerializer):
    """Read representation of an Inspection, for a mill owner viewing their own inspection history."""

    officer_name = serializers.CharField(source="officer.full_name", default=None)

    class Meta:
        model = Inspection
        fields = ["id", "inspection_date", "result", "notes", "officer_name"]


class OfficerInspectionSerializer(serializers.ModelSerializer):
    """Read representation of an Inspection for the officer-side view, with the mill's details nested in."""

    mill_name = serializers.CharField(source="mill.mill_name", default=None)
    mill_registration_no = serializers.CharField(source="mill.registration_no", default=None)
    officer_name = serializers.CharField(source="officer.full_name", default=None)

    class Meta:
        model = Inspection
        fields = [
            "id", "mill", "mill_name", "mill_registration_no",
            "inspection_date", "result", "notes", "officer_name",
        ]


class InspectionWriteSerializer(serializers.ModelSerializer):
    """Create representation of an Inspection, submitted by an officer for a specific mill."""

    class Meta:
        model = Inspection
        fields = ["id", "mill", "result", "notes"]


class MillingAllocationSerializer(serializers.ModelSerializer):
    """Read representation of a MillingAllocation, for a mill owner viewing their own requests."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    delivery = serializers.SerializerMethodField()

    class Meta:
        model = MillingAllocation
        fields = [
            "id", "paddy_type", "paddy_type_name", "quantity_kg", "status",
            "requested_date", "review_notes", "delivery",
        ]

    def get_delivery(self, obj):
        return _delivery_status(obj)


class MillingAllocationCreateSerializer(serializers.ModelSerializer):
    """Create representation of a MillingAllocation (submitted by the mill owner); mill/status are set server-side."""

    class Meta:
        model = MillingAllocation
        fields = ["id", "paddy_type", "quantity_kg"]


class OfficerMillingAllocationSerializer(serializers.ModelSerializer):
    """Read representation of a MillingAllocation for the officer-side review queue, with the requester mill's details nested in."""

    mill_name = serializers.CharField(source="mill.mill_name", default=None)
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", default=None)
    fulfilled_from_warehouse_name = serializers.CharField(source="fulfilled_from_warehouse.name", default=None)
    has_delivery = serializers.SerializerMethodField()

    class Meta:
        model = MillingAllocation
        fields = [
            "id", "mill", "mill_name", "paddy_type", "paddy_type_name",
            "quantity_kg", "status", "requested_date", "reviewed_by_name",
            "fulfilled_from_warehouse", "fulfilled_from_warehouse_name", "review_notes",
            "has_delivery",
        ]

    def get_has_delivery(self, obj):
        return obj.deliveries.exists()


class MillStockSerializer(serializers.ModelSerializer):
    """Read representation of a mill's stock-on-hand for a single paddy type."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = MillStock
        fields = ["id", "paddy_type", "paddy_type_name", "quantity_kg"]


class MillingReturnRequestSerializer(serializers.ModelSerializer):
    """Read representation of a MillingReturnRequest, for a mill owner viewing their own return requests."""

    destination_warehouse_name = serializers.CharField(source="destination_warehouse.name", default=None)
    delivery = serializers.SerializerMethodField()

    class Meta:
        model = MillingReturnRequest
        fields = [
            "id", "allocation", "destination_warehouse", "destination_warehouse_name",
            "rice_kg", "status", "requested_date", "review_notes", "delivery",
        ]

    def get_delivery(self, obj):
        return _delivery_status(obj)


class MillingReturnRequestCreateSerializer(serializers.ModelSerializer):
    """Create representation of a MillingReturnRequest (submitted by the mill owner); mill/status are set server-side."""

    class Meta:
        model = MillingReturnRequest
        fields = ["id", "allocation", "destination_warehouse", "rice_kg"]

    def validate_allocation(self, value):
        request = self.context.get("request")
        if request and value.mill.user_id != request.user.id:
            raise serializers.ValidationError("You can only request a return for your own mill's allocation.")
        if value.status != MillingAllocation.Status.FULFILLED:
            raise serializers.ValidationError("Only a fulfilled allocation can have a return requested.")
        return value


class OfficerMillingReturnRequestSerializer(serializers.ModelSerializer):
    """Read representation of a MillingReturnRequest for the officer-side review queue."""

    mill_name = serializers.CharField(source="mill.mill_name", default=None)
    destination_warehouse_name = serializers.CharField(source="destination_warehouse.name", default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", default=None)
    has_delivery = serializers.SerializerMethodField()

    class Meta:
        model = MillingReturnRequest
        fields = [
            "id", "mill", "mill_name", "allocation", "destination_warehouse",
            "destination_warehouse_name", "rice_kg", "status", "requested_date",
            "reviewed_by_name", "review_notes", "has_delivery",
        ]

    def get_has_delivery(self, obj):
        return obj.deliveries.exists()
