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


class ErrorLog(models.Model):
    """
    An unhandled/unexpected exception raised while serving an API request.
    Written automatically by sysops.exception_handler.custom_exception_handler
    (registered as DRF's EXCEPTION_HANDLER in settings.py) rather than by any
    view remembering to log it — every current and future endpoint is
    covered without per-view instrumentation, which is the point: this is
    general-purpose activity/error monitoring, not a hand-picked list of
    business actions like AuditLog.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="error_logs",
    )
    actor_label = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=10, blank=True)
    path = models.CharField(max_length=500, blank=True)
    exception_type = models.CharField(max_length=200, blank=True)
    message = models.TextField(blank=True)
    status_code = models.IntegerField(null=True, blank=True)
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


class SystemChangeRequest(models.Model):
    """
    A PMB officer's request for the admin to make a system change — a
    "waiting list with a payment attached": the officer submits a title/
    description, an admin reviews it and either rejects it outright or
    accepts it by setting a fee, which creates a Stripe Checkout Session
    the officer must pay before a `token` is issued (see
    StripeWebhookView). Once the token is issued, the admin (not the
    officer — see SystemChangeRequestProgressUpdate) tracks work progress
    through to completion, mirroring farmers.models.Delivery's
    status-plus-driver-updates shape but with the admin as the one
    reporting progress instead of a driver.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAYMENT_PENDING = "payment_pending", "Payment Pending"
        TOKEN_ISSUED = "token_issued", "Token Issued"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="system_change_requests"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Set by the admin on accept (see SystemChangeRequestViewSet.accept) —
    # null until then, since the officer never proposes their own amount.
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="lkr")

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_system_change_requests",
    )
    rejection_reason = models.TextField(blank=True)

    stripe_checkout_session_id = models.CharField(max_length=255, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)

    # Generated only once payment succeeds (StripeWebhookView) — an
    # unguessable string, same "random token" spirit as
    # accounts.serializers.generate_temp_password, just longer since this
    # isn't meant to be typed by a human.
    token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    token_issued_at = models.DateTimeField(null=True, blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class SystemChangeRequestProgressUpdate(models.Model):
    """
    One admin-authored progress entry against an accepted
    SystemChangeRequest, building a timeline the requesting officer can
    watch — the admin-side counterpart to how a driver updates
    farmers.models.Delivery.status. Posting `stage=DEPLOYED` also flips the
    parent request's status to COMPLETED (see
    SystemChangeRequestViewSet.post_progress).
    """

    class Stage(models.TextChoices):
        REVIEWING = "reviewing", "Reviewing"
        IN_DEVELOPMENT = "in_development", "In Development"
        TESTING = "testing", "Testing"
        DEPLOYED = "deployed", "Deployed"

    request = models.ForeignKey(
        SystemChangeRequest, on_delete=models.CASCADE, related_name="progress_updates"
    )
    stage = models.CharField(max_length=20, choices=Stage.choices)
    note = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.request.title}: {self.stage}"
