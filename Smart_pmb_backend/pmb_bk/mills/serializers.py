# Serializers for the mills app. Follows the same "read serializer nests
# human-readable names, write serializer accepts plain foreign-key ids"
# pattern used in farmers/serializers.py.
from rest_framework import serializers

from .models import Inspection, License, Mill, MillingReport


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
            "expiry_date", "review_notes",
        ]


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
            "reviewed_by_name", "review_notes",
        ]


class MillingReportSerializer(serializers.ModelSerializer):
    """Read representation of a MillingReport, with the linked harvest/paddy type resolved for display."""

    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = MillingReport
        fields = [
            "id", "report_date", "paddy_processed_kg", "rice_output_kg", "notes",
            "harvest", "paddy_type", "paddy_type_name",
        ]


class MillingReportWriteSerializer(serializers.ModelSerializer):
    """Create representation of a MillingReport (submitted by the mill owner). harvest/paddy_type are optional — see MillingReport's docstring."""

    class Meta:
        model = MillingReport
        fields = ["id", "paddy_processed_kg", "rice_output_kg", "notes", "harvest", "paddy_type"]


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
