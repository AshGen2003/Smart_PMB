from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from accounts.models import Role, User

from .models import AuditLog, AuthLog, BackupRecord


def build_admin_report_data():
    now = timezone.now()
    since_30d = now - timedelta(days=30)

    roles = Role.objects.annotate(member_count=Count("users")).prefetch_related(
        "permissions"
    ).order_by("-member_count")
    role_rows = [
        {
            "name": r.name,
            "user_count": r.member_count,
            "permission_count": r.permissions.count(),
        }
        for r in roles
    ]

    auth_30d = AuthLog.objects.filter(created_at__gte=since_30d)
    security = {
        "login_success": auth_30d.filter(action="login_success").count(),
        "login_failed": auth_30d.filter(action="login_failed").count(),
        "account_locked": auth_30d.filter(action="account_locked").count(),
    }

    recent_audit = [
        {
            "created_at": log.created_at,
            "actor": log.user.email if log.user_id else (log.actor_label or "System"),
            "action": log.action,
            "module": log.module,
            "details": log.details,
        }
        for log in AuditLog.objects.select_related("user").order_by("-created_at")[:20]
    ]

    recent_auth = [
        {
            "created_at": log.created_at,
            "email": log.email,
            "action": log.action,
            "ip_address": log.ip_address,
        }
        for log in AuthLog.objects.order_by("-created_at")[:20]
    ]

    backups = BackupRecord.objects.all()
    last_backup = backups.first()

    return {
        "generated_at": now,
        "users": {
            "total": User.objects.count(),
            "active": User.objects.filter(is_active=True).count(),
        },
        "roles": role_rows,
        "security": security,
        "recent_audit": recent_audit,
        "recent_auth": recent_auth,
        "backups": {
            "total": backups.count(),
            "completed": backups.filter(status=BackupRecord.Status.COMPLETED).count(),
            "failed": backups.filter(status=BackupRecord.Status.FAILED).count(),
            "last": (
                {"created_at": last_backup.created_at, "status": last_backup.status}
                if last_backup
                else None
            ),
        },
    }
