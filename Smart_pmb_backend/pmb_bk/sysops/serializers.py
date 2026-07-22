# Read-only serializers for the sysops admin API: audit/auth log listings,
# system alerts, and backup records.
from rest_framework import serializers

from .models import AuditLog, AuthLog, BackupRecord, SystemAlert


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
