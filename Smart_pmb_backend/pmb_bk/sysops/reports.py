# Builds the data set behind the "Admin Report": a snapshot of recent
# security activity, audit trail, and backup history. Used by both
# AdminReportView (JSON) and AdminReportPdfView (PDF, via pdf.py) in
# views.py, so the two always show identical numbers.
from datetime import timedelta

from django.utils import timezone

from .models import AuditLog, AuthLog, BackupRecord


def build_admin_report_data():
    """Assemble the admin report's data dict: 30-day login security counts and recent log/backup entries."""
    now = timezone.now()
    since_30d = now - timedelta(days=30)

    auth_30d = AuthLog.objects.filter(created_at__gte=since_30d)
    security = {
        "login_success": auth_30d.filter(action="login_success").count(),
        "login_failed": auth_30d.filter(action="login_failed").count(),
        "account_locked": auth_30d.filter(action="account_locked").count(),
    }

    # Only the 20 most recent entries are included in the report — this is
    # a summary snapshot, not a full export (the full logs are browsable
    # via AuditLogViewSet/AuthLogViewSet).
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
    last_backup = backups.first()  # BackupRecord.Meta orders by -created_at, so first() is the most recent

    # Daily success/failed login counts for the last 14 days, oldest first —
    # the time series behind the admin report's login-activity chart.
    since_14d = now - timedelta(days=14)
    daily_counts = {}
    for log in AuthLog.objects.filter(
        created_at__gte=since_14d, action__in=["login_success", "login_failed"]
    ):
        day = log.created_at.date()
        bucket = daily_counts.setdefault(day, {"success": 0, "failed": 0})
        bucket["success" if log.action == "login_success" else "failed"] += 1
    login_activity_trend = [
        {
            "date": (since_14d.date() + timedelta(days=i)).strftime("%b %d"),
            "success": daily_counts.get(since_14d.date() + timedelta(days=i), {}).get("success", 0),
            "failed": daily_counts.get(since_14d.date() + timedelta(days=i), {}).get("failed", 0),
        }
        for i in range(15)
    ]

    return {
        "generated_at": now,
        "security": security,
        "login_activity_trend": login_activity_trend,
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
