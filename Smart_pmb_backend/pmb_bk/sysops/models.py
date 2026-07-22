# Data models for the sysops app: system-administration records that
# aren't part of the core paddy-purchasing domain. AuditLog tracks who did
# what (created via sysops.utils.log_audit from admin/officer views).
# AuthLog tracks login/logout/lockout events (via sysops.utils.log_auth).
# SystemAlert holds operational warnings for the admin to review.
# BackupRecord tracks database backups triggered from the admin UI.
# SystemConfig is a runtime-editable key/value settings store (see
# sysops/utils.py for the known keys and their defaults).
from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """A record of one admin/officer action (e.g. "create_user", "approve_harvest") for accountability/traceability."""

    # SET_NULL (not CASCADE) — deleting the actor shouldn't erase the record
    # that they did something; "system"/unknown actor is a valid, expected state.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="audit_logs",
    )
    actor_label = models.CharField(max_length=255, blank=True)
    action = models.CharField(max_length=100)
    module = models.CharField(max_length=50)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class AuthLog(models.Model):
    """A record of one authentication-related event: successful/failed login, account lockout, or logout."""

    class Action(models.TextChoices):
        LOGIN_SUCCESS = "login_success", "Login Success"
        LOGIN_FAILED = "login_failed", "Login Failed"
        ACCOUNT_LOCKED = "account_locked", "Account Locked"
        LOGOUT = "logout", "Logout"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="auth_logs",
    )
    email = models.CharField(max_length=255, blank=True)
    ip_address = models.CharField(max_length=45, blank=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class SystemAlert(models.Model):
    """An operational warning/notice raised for admin attention (e.g. low stock, system issue), trackable through open/acknowledged/resolved."""

    class Level(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        RESOLVED = "resolved", "Resolved"

    alert_type = models.CharField(max_length=100)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="handled_alerts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class BackupRecord(models.Model):
    """Log entry for one database backup run (via Django's `dumpdata`), recording where the snapshot was written and its outcome."""

    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    backup_type = models.CharField(max_length=50, default="manual")
    file_path = models.CharField(max_length=500, blank=True)
    backup_size = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices)
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="backups_performed",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class SystemConfig(models.Model):
    """
    A single runtime-editable setting, stored as a key/string-value pair
    (e.g. key="idle_logout_minutes", value="15"). Rows only exist for
    settings an admin has actually changed from their default — see
    sysops.utils.get_config_value for how defaults are applied when no
    row exists yet.
    """

    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=500)
    category = models.CharField(max_length=50, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="config_changes",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key
