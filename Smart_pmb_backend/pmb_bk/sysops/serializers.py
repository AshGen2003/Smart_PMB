from rest_framework import serializers

from .models import AuditLog, AuthLog, BackupRecord, SystemAlert


class AuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "action", "module", "details", "created_at"]

    def get_actor(self, obj):
        if obj.user_id:
            return obj.user.email
        return obj.actor_label or "System"


class AuthLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthLog
        fields = ["id", "email", "ip_address", "action", "created_at"]


class SystemAlertSerializer(serializers.ModelSerializer):
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
    performed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = BackupRecord
        fields = [
            "id", "backup_type", "file_path", "backup_size", "status",
            "notes", "performed_by_email", "created_at",
        ]

    def get_performed_by_email(self, obj):
        return obj.performed_by.email if obj.performed_by_id else None
