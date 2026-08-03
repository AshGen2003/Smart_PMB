# Shared helper functions used across all three apps (accounts, farmers,
# sysops) for writing audit/auth log entries, raising system alerts, and
# reading/writing the runtime-editable SystemConfig settings. Centralizing
# these here means views never touch the sysops models directly, they just
# call these helpers.
from .models import AuditLog, AuthLog, SystemAlert, SystemConfig

# Known, admin-editable settings. "default" is used whenever no SystemConfig
# row exists yet (fresh install) — callers should never need a second fallback.
CONFIG_DEFS = {
    "idle_logout_minutes": {"default": "15", "category": "session", "type": "int"},
    "login_lockout_threshold": {"default": "5", "category": "security", "type": "int"},
    "login_lockout_minutes": {"default": "15", "category": "security", "type": "int"},
    "maintenance_mode": {"default": "false", "category": "system", "type": "bool"},
    # Operational kill switches — default "true" (enabled) so nothing
    # changes for anyone until an admin explicitly flips one off.
    "payments_enabled": {"default": "true", "category": "system", "type": "bool"},
    "sms_enabled": {"default": "true", "category": "system", "type": "bool"},
    "signups_enabled": {"default": "true", "category": "system", "type": "bool"},
}


def get_client_ip(request):
    """Best-effort client IP lookup: prefers the X-Forwarded-For header (behind a proxy/load balancer), else REMOTE_ADDR."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        # X-Forwarded-For can be a comma-separated chain of proxies; the
        # first entry is the original client.
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def log_audit(user, action, module, details=""):
    """Write one AuditLog entry. Call this from any view that performs an admin/officer mutation worth tracking."""
    AuditLog.objects.create(
        user=user if (user and getattr(user, "is_authenticated", False)) else None,
        actor_label=user.email if (user and getattr(user, "is_authenticated", False)) else "",
        action=action,
        module=module,
        details=details,
    )


def log_auth(request, action, user=None, email=""):
    """Write one AuthLog entry (login success/failure, lockout, logout), capturing the requester's IP address."""
    AuthLog.objects.create(
        user=user,
        email=email or (user.email if user else ""),
        ip_address=get_client_ip(request),
        action=action,
    )


REPEATED_LOGIN_FAILURE_ALERT_THRESHOLD = 3


def raise_repeated_login_failure_alert(user):
    """
    Raises a SystemAlert once a user's consecutive failed login attempts
    reaches REPEATED_LOGIN_FAILURE_ALERT_THRESHOLD — an early warning
    distinct from the separately configurable account-lockout threshold
    (CONFIG_DEFS["login_lockout_threshold"], usually set higher), so an
    admin sees a heads-up before an account actually locks. `alert_type`
    encodes the user id so this only fires once per failure streak while
    an alert is still open — mirrors farmers.views._raise_high_capacity_alert.
    A successful login or an eventual lockout resets failed_login_attempts
    to 0 (see accounts/serializers.py's CustomTokenObtainPairSerializer),
    letting a future streak raise a fresh alert.
    """
    if user.failed_login_attempts < REPEATED_LOGIN_FAILURE_ALERT_THRESHOLD:
        return
    alert_type = f"repeated_login_failures_{user.id}"
    already_open = SystemAlert.objects.filter(
        alert_type=alert_type, status=SystemAlert.Status.OPEN
    ).exists()
    if already_open:
        return
    SystemAlert.objects.create(
        alert_type=alert_type,
        level=SystemAlert.Level.WARNING,
        message=(
            f"{user.email} has had {user.failed_login_attempts} consecutive failed "
            "login attempts."
        ),
    )


def get_config_value(key):
    """
    Look up one setting's current value: reads the SystemConfig row if an
    admin has ever changed it, otherwise falls back to CONFIG_DEFS, and
    coerces to the declared type (int/bool/str).
    """
    definition = CONFIG_DEFS[key]
    row = SystemConfig.objects.filter(key=key).first()
    raw = row.value if row else definition["default"]
    if definition["type"] == "int":
        return int(raw)
    if definition["type"] == "bool":
        return raw.lower() == "true"
    return raw


def get_all_configs():
    """Return every known setting as a {key: coerced_value} dict, for the admin system-config screen."""
    return {key: get_config_value(key) for key in CONFIG_DEFS}


def set_config_value(key, value, user):
    """Persist a new value for a known setting, recording which admin changed it. Raises KeyError for unknown keys."""
    if key not in CONFIG_DEFS:
        raise KeyError(key)
    SystemConfig.objects.update_or_create(
        key=key,
        defaults={
            "value": str(value),
            "category": CONFIG_DEFS[key]["category"],
            "updated_by": user if getattr(user, "is_authenticated", False) else None,
        },
    )
