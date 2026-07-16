from .models import AuditLog, AuthLog, SystemConfig

# Known, admin-editable settings. "default" is used whenever no SystemConfig
# row exists yet (fresh install) — callers should never need a second fallback.
CONFIG_DEFS = {
    "idle_logout_minutes": {"default": "15", "category": "session", "type": "int"},
    "login_lockout_threshold": {"default": "5", "category": "security", "type": "int"},
    "login_lockout_minutes": {"default": "15", "category": "security", "type": "int"},
    "maintenance_mode": {"default": "false", "category": "system", "type": "bool"},
}


def get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def log_audit(user, action, module, details=""):
    AuditLog.objects.create(
        user=user if (user and getattr(user, "is_authenticated", False)) else None,
        actor_label=user.email if (user and getattr(user, "is_authenticated", False)) else "",
        action=action,
        module=module,
        details=details,
    )


def log_auth(request, action, user=None, email=""):
    AuthLog.objects.create(
        user=user,
        email=email or (user.email if user else ""),
        ip_address=get_client_ip(request),
        action=action,
    )


def get_config_value(key):
    definition = CONFIG_DEFS[key]
    row = SystemConfig.objects.filter(key=key).first()
    raw = row.value if row else definition["default"]
    if definition["type"] == "int":
        return int(raw)
    if definition["type"] == "bool":
        return raw.lower() == "true"
    return raw


def get_all_configs():
    return {key: get_config_value(key) for key in CONFIG_DEFS}


def set_config_value(key, value, user):
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
