# Read-only serializers for the sysops admin API: audit/auth log listings,
# system alerts, and backup records.
from decimal import Decimal

from rest_framework import serializers

from .models import (
    AuditLog,
    AuthLog,
    BackupRecord,
    ErrorLog,
    SystemAlert,
    SystemChangeRequest,
    SystemChangeRequestProgressUpdate,
)


class AuditLogSerializer(serializers.ModelSerializer):
    """Read representation of an AuditLog entry, resolving the actor to an email (or "System" if none)."""

    actor = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "action", "module", "details", "created_at"]

    def get_actor(self, obj):
        # The acting user may have since been deleted (user is SET_NULL),
        # in which case fall back to the snapshotted actor_label, or
        # finally "System" for automated/unattributed actions.
        if obj.user_id:
            return obj.user.email
        return obj.actor_label or "System"


class ErrorLogSerializer(serializers.ModelSerializer):
    """Read representation of an ErrorLog entry, resolving the actor to an email (or "System"/anonymous if none)."""

    actor = serializers.SerializerMethodField()

    class Meta:
        model = ErrorLog
        fields = [
            "id", "actor", "method", "path", "exception_type",
            "message", "status_code", "created_at",
        ]

    def get_actor(self, obj):
        if obj.user_id:
            return obj.user.email
        return obj.actor_label or "Anonymous"


class AuthLogSerializer(serializers.ModelSerializer):
    """Read representation of an AuthLog entry."""

    class Meta:
        model = AuthLog
        fields = ["id", "email", "ip_address", "action", "created_at"]


class SystemAlertSerializer(serializers.ModelSerializer):
    """Read representation of a SystemAlert, resolving the handling admin to an email."""

    handled_by_email = serializers.SerializerMethodField()

    class Meta:
        model = SystemAlert
        fields = [
            "id", "alert_type", "level", "message", "status",
            "handled_by_email", "created_at", "resolved_at",
        ]

    def get_handled_by_email(self, obj):
        return obj.handled_by.email if obj.handled_by_id else None


class BackupRecordSerializer(serializers.ModelSerializer):
    """Read representation of a BackupRecord, resolving the performing admin to an email."""

    performed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = BackupRecord
        fields = [
            "id", "backup_type", "file_path", "backup_size", "status",
            "notes", "performed_by_email", "created_at",
        ]

    def get_performed_by_email(self, obj):
        return obj.performed_by.email if obj.performed_by_id else None


class SystemChangeRequestProgressUpdateSerializer(serializers.ModelSerializer):
    """Read representation of one progress-timeline entry, resolving the admin who posted it to a name."""

    updated_by_name = serializers.CharField(source="updated_by.full_name", default=None)

    class Meta:
        model = SystemChangeRequestProgressUpdate
        fields = ["id", "stage", "note", "updated_by_name", "created_at"]


class SystemChangeRequestSerializer(serializers.ModelSerializer):
    """
    Read representation of a SystemChangeRequest, with its progress
    timeline nested and requester/reviewer resolved to names. Shared by
    both the requesting officer's own view and the admin's queue view —
    Stripe's raw IDs are included since they're only ever exposed to
    "manage_system_requests" holders in practice (the officer-facing
    frontend page simply doesn't render those fields), not because this
    serializer itself restricts the audience.
    """

    requested_by_name = serializers.CharField(source="requested_by.full_name", default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", default=None)
    progress_updates = SystemChangeRequestProgressUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = SystemChangeRequest
        fields = [
            "id", "requested_by", "requested_by_name", "title", "description", "status",
            "fee_amount", "currency", "reviewed_by", "reviewed_by_name", "rejection_reason",
            "stripe_checkout_session_id", "stripe_payment_intent_id",
            "token", "token_issued_at", "submitted_at", "updated_at", "progress_updates",
        ]


class SystemChangeRequestCreateSerializer(serializers.ModelSerializer):
    """Write-only payload for an officer submitting a new request — just title/description; everything else starts at its default."""

    class Meta:
        model = SystemChangeRequest
        fields = ["title", "description"]


class SystemChangeRequestAcceptSerializer(serializers.Serializer):
    """Write-only payload for the admin's accept action — the fee amount they're setting."""

    fee_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))


class SystemChangeRequestRejectSerializer(serializers.Serializer):
    """Write-only payload for the admin's reject action."""

    reason = serializers.CharField(allow_blank=True, required=False, default="")


class SystemChangeRequestProgressCreateSerializer(serializers.Serializer):
    """Write-only payload for the admin posting a new progress-timeline entry."""

    stage = serializers.ChoiceField(choices=SystemChangeRequestProgressUpdate.Stage.choices)
    note = serializers.CharField(allow_blank=True, required=False, default="")
