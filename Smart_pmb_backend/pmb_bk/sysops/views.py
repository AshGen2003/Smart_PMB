# API views for system administration: browsing audit/auth logs, managing
# system alerts, triggering/listing database backups, reading and editing
# runtime SystemConfig settings, and generating the admin report (JSON and
# PDF forms).
import io
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.http import FileResponse
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasPermission

from .models import AuditLog, AuthLog, BackupRecord, ErrorLog, SystemAlert
from .pdf import build_admin_report_pdf
from .reports import build_admin_report_data
from .serializers import (
    AuditLogSerializer,
    AuthLogSerializer,
    BackupRecordSerializer,
    ErrorLogSerializer,
    SystemAlertSerializer,
)
from .utils import CONFIG_DEFS, get_all_configs, log_audit, set_config_value

LOG_LIMIT = 200  # cap on how many log/backup rows the admin UI list views return


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only, most-recent-first list of AuditLog entries (admin/officer action history); requires "view_audit_logs"."""

    permission_classes = [HasPermission("view_audit_logs")]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related("user")[:LOG_LIMIT]


class AuthLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only, most-recent-first list of AuthLog entries (login/logout/lockout history); requires "view_audit_logs"."""

    permission_classes = [HasPermission("view_audit_logs")]
    serializer_class = AuthLogSerializer
    queryset = AuthLog.objects.select_related("user")[:LOG_LIMIT]


class ErrorLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    Read-only, most-recent-first list of ErrorLog entries — unhandled
    exceptions raised anywhere across the API, captured automatically by
    sysops/exception_handler.py rather than hand-picked per view. Requires
    "view_audit_logs", same as the other log listings.
    """

    permission_classes = [HasPermission("view_audit_logs")]
    serializer_class = ErrorLogSerializer
    queryset = ErrorLog.objects.select_related("user")[:LOG_LIMIT]


class SystemAlertViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """
    View and triage SystemAlert records. Viewing requires "view_audit_logs";
    acknowledging/resolving an alert (which requires more trust, since it
    changes state) requires "manage_system".
    """

    serializer_class = SystemAlertSerializer
    queryset = SystemAlert.objects.select_related("handled_by")

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasPermission("view_audit_logs")()]
        return [HasPermission("manage_system")()]

    def _set_status(self, request, pk, new_status):
        # Shared implementation behind the acknowledge/resolve actions:
        # records who handled it and, only when fully resolved, stamps
        # resolved_at.
        alert = self.get_object()
        alert.status = new_status
        alert.handled_by = request.user
        if new_status == SystemAlert.Status.RESOLVED:
            alert.resolved_at = timezone.now()
        alert.save(update_fields=["status", "handled_by", "resolved_at"])
        log_audit(request.user, f"alert_{new_status}", "sysops", alert.alert_type)
        return Response(SystemAlertSerializer(alert).data)

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Marks an alert as seen/being worked on, without closing it."""
        return self._set_status(request, pk, SystemAlert.Status.ACKNOWLEDGED)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Closes out an alert as fully handled."""
        return self._set_status(request, pk, SystemAlert.Status.RESOLVED)


class BackupRecordViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Lists past backups and lets an admin trigger a new one on demand. Listing requires "view_audit_logs"; running one requires "manage_system"."""

    serializer_class = BackupRecordSerializer
    queryset = BackupRecord.objects.select_related("performed_by")[:LOG_LIMIT]

    def get_permissions(self):
        if self.action == "list":
            return [HasPermission("view_audit_logs")()]
        return [HasPermission("manage_system")()]

    @action(detail=False, methods=["post"])
    def run(self, request):
        """
        Triggers an on-demand backup: dumps the accounts and farmers app
        data (Django's `dumpdata` management command) to a timestamped
        JSON file under MEDIA_ROOT/backups/, and records the outcome as a
        BackupRecord either way (completed or failed).
        """
        backups_dir = Path(settings.MEDIA_ROOT) / "backups"
        backups_dir.mkdir(parents=True, exist_ok=True)
        filename = f"backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        file_path = backups_dir / filename

        try:
            # dumpdata normally writes straight to stdout; capture it into
            # an in-memory buffer instead so we can write it to our own
            # timestamped file path.
            buffer = io.StringIO()
            call_command("dumpdata", "accounts", "farmers", indent=2, stdout=buffer)
            file_path.write_text(buffer.getvalue(), encoding="utf-8")
            record = BackupRecord.objects.create(
                backup_type="manual",
                file_path=f"backups/{filename}",
                backup_size=file_path.stat().st_size,
                status=BackupRecord.Status.COMPLETED,
                performed_by=request.user,
            )
            log_audit(request.user, "run_backup", "sysops", filename)
        except Exception as exc:
            # Record the failure itself as a BackupRecord too, so failed
            # attempts are visible in the admin UI's backup history.
            record = BackupRecord.objects.create(
                backup_type="manual",
                status=BackupRecord.Status.FAILED,
                notes=str(exc),
                performed_by=request.user,
            )
            log_audit(request.user, "backup_failed", "sysops", str(exc))

        return Response(
            BackupRecordSerializer(record).data,
            status=(
                status.HTTP_201_CREATED
                if record.status == BackupRecord.Status.COMPLETED
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )


class SystemConfigView(APIView):
    """Read (any logged-in user) and edit (requires "manage_system") the runtime SystemConfig key/value settings."""

    def get_permissions(self):
        if self.request.method == "GET":
            # Every admin-shell user (not just manage_system holders) needs to
            # read idle_logout_minutes/maintenance_mode to render correctly.
            return [IsAuthenticated()]
        return [HasPermission("manage_system")()]

    def get(self, request):
        return Response(get_all_configs())

    def patch(self, request):
        # Accepts a partial {key: value} payload; unknown keys are
        # silently ignored rather than rejected outright.
        updated = []
        for key, value in request.data.items():
            if key not in CONFIG_DEFS:
                continue
            set_config_value(key, value, request.user)
            updated.append(key)
        if updated:
            log_audit(request.user, "update_system_config", "sysops", ", ".join(updated))
        return Response(get_all_configs())


class AdminReportView(APIView):
    """JSON version of the admin report (see reports.build_admin_report_data)."""

    permission_classes = [HasPermission("manage_users")]

    def get(self, request):
        return Response(build_admin_report_data())


class AdminReportPdfView(APIView):
    """PDF version of the admin report, streamed back as a downloadable file attachment."""

    permission_classes = [HasPermission("manage_users")]

    def get(self, request):
        data = build_admin_report_data()
        buffer = build_admin_report_pdf(data)
        log_audit(request.user, "download_admin_report_pdf", "sysops")
        return FileResponse(
            buffer,
            as_attachment=True,
            filename="pmb-admin-report.pdf",
            content_type="application/pdf",
        )
