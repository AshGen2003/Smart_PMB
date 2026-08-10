# API views for system administration: browsing audit/auth logs, managing
# system alerts, triggering/listing database backups, reading and editing
# runtime SystemConfig settings, generating the admin report (JSON and PDF
# forms), and the system-change-request/Stripe-payment/token workflow.
import io
import secrets
from datetime import datetime
from pathlib import Path

import stripe
from django.conf import settings
from django.core.management import call_command
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.models import Message
from accounts.permissions import HasPermission

from .models import (
    AuditLog,
    AuthLog,
    BackupRecord,
    ErrorLog,
    SystemAlert,
    SystemChangeRequest,
    SystemChangeRequestProgressUpdate,
)
from .pdf import build_admin_report_pdf
from .reports import build_admin_report_data
from .serializers import (
    AuditLogSerializer,
    AuthLogSerializer,
    BackupRecordSerializer,
    ErrorLogSerializer,
    SystemAlertSerializer,
    SystemChangeRequestAcceptSerializer,
    SystemChangeRequestCreateSerializer,
    SystemChangeRequestProgressCreateSerializer,
    SystemChangeRequestRejectSerializer,
    SystemChangeRequestSerializer,
)
from .utils import (
    CONFIG_DEFS,
    WAREHOUSE_ALERT_TYPE_PREFIXES,
    get_all_configs,
    get_config_value,
    log_audit,
    raise_stripe_payment_failed_alert,
    set_config_value,
)

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
    sysops/exception_handler.py rather than hand-picked per view. Listing
    requires "view_audit_logs"; clearing the log requires "manage_system",
    same split as the other log/backup views below.
    """

    serializer_class = ErrorLogSerializer
    queryset = ErrorLog.objects.select_related("user")[:LOG_LIMIT]

    def get_permissions(self):
        if self.action == "list":
            return [HasPermission("view_audit_logs")()]
        return [HasPermission("manage_system")()]

    @action(detail=False, methods=["post"])
    def clear(self, request):
        """Deletes every ErrorLog row — a manual "I've seen these" reset, not a filtered/partial clear."""
        deleted_count, _ = ErrorLog.objects.all().delete()
        log_audit(request.user, "clear_error_logs", "sysops", f"{deleted_count} entries")
        return Response(status=status.HTTP_204_NO_CONTENT)


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

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            # This tab is for system-health alerts (repeated login
            # failures, failed Stripe payments) — every warehouse-capacity
            # alert type is PMB business/operational data, not a system
            # concern, so all of them are excluded here regardless of
            # level. They're still fully reachable via the PMB officer's
            # own Warehouses > Alerts tab (farmers.views.WarehouseViewSet.alerts)
            # and the warehouse manager's own dashboard — this only trims
            # what shows up in the admin console.
            for prefix in WAREHOUSE_ALERT_TYPE_PREFIXES:
                qs = qs.exclude(alert_type__startswith=prefix)
        return qs

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

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """
        Streams a completed backup's dump file back to the caller as an
        attachment. Looks up the record directly (not via self.get_object(),
        which would filter the class-level `queryset` — that's sliced to
        `[:LOG_LIMIT]` for the list action, and Django can't `.get()` off an
        already-sliced queryset) rather than through the sliced list queryset.
        """
        record = get_object_or_404(BackupRecord, pk=pk)
        if record.status != BackupRecord.Status.COMPLETED or not record.file_path:
            return Response({"detail": "This backup has no file to download."}, status=404)

        file_path = Path(settings.MEDIA_ROOT) / record.file_path
        if not file_path.exists():
            return Response({"detail": "Backup file is missing on disk."}, status=404)

        return FileResponse(
            open(file_path, "rb"), as_attachment=True, filename=file_path.name
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


def _notify_admins_new_request(change_request):
    """
    Notifies the admin team a new system-change request needs review —
    same Message-based, shows-up-in-the-notification-bell pattern as
    farmers.views._notify_driver_assigned uses for a newly assigned
    delivery task.
    """
    Message.objects.create(
        sender=change_request.requested_by,
        target_role=Message.TargetRole.ADMIN,
        body=(
            f'New system change request: "{change_request.title}" from '
            f"{change_request.requested_by.full_name or change_request.requested_by.email}."
        ),
    )


def _notify_requester(change_request, sender, body):
    """
    Notifies the officer who submitted a request about a status/progress
    change on it — the request-side counterpart to
    _notify_admins_new_request above, same Message-based pattern as
    farmers.views._notify_driver_assigned.
    """
    Message.objects.create(sender=sender, recipient=change_request.requested_by, body=body)


class SystemChangeRequestViewSet(viewsets.ModelViewSet):
    """
    PMB officer submission plus admin review/payment/progress-tracking for
    system-change requests — see SystemChangeRequest's docstring in
    models.py for the full pending -> payment_pending -> token_issued ->
    in_progress -> completed (or rejected) lifecycle. One viewset serves
    both audiences via queryset scoping (get_queryset below): an officer
    only ever sees their own requests; an admin holding
    "manage_system_requests" sees every request — the "waiting list". No
    update — a request is only ever advanced through the accept/reject/
    progress actions below, never edited freehand. Delete is allowed, but
    only while fee_amount is still unset (i.e. status is PENDING or
    REJECTED — accept() is the only path that ever sets a fee, and it's
    only callable from PENDING) — mirrors purchases.views.RiceRequestViewSet
    .destroy's "only pending requests can be withdrawn" rule, extended
    slightly to also let officers clear out a rejected request, while
    still guaranteeing anything with a real Stripe payment/token behind it
    (and so listed in the Payments & Tokens tab) can never be deleted.
    """

    queryset = SystemChangeRequest.objects.select_related(
        "requested_by", "reviewed_by"
    ).prefetch_related("progress_updates__updated_by")
    serializer_class = SystemChangeRequestSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [HasPermission("request_system_changes")()]
        if self.action in ("list", "retrieve", "checkout_url", "cancel_expired_payment", "destroy"):
            # Queryset scoping in get_queryset does the real access control
            # here — any authenticated user may call these, but an
            # officer-scoped queryset means they only ever reach their own
            # requests (get_object() 404s otherwise), same as an admin
            # reaching every request. destroy() itself additionally checks
            # fee_amount below before allowing the delete through.
            return [IsAuthenticated()]
        return [HasPermission("manage_system_requests")()]

    def get_queryset(self):
        qs = super().get_queryset()
        if HasPermission("manage_system_requests").has_permission(self.request, self):
            return qs
        return qs.filter(requested_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        change_request = self.get_object()
        if change_request.fee_amount is not None:
            return Response(
                {"detail": "Requests with a payment on record can't be deleted."}, status=400
            )
        title = change_request.title
        response = super().destroy(request, *args, **kwargs)
        log_audit(request.user, "delete_system_change_request", "sysops", title)
        return response

    def get_serializer_class(self):
        if self.action == "create":
            return SystemChangeRequestCreateSerializer
        return SystemChangeRequestSerializer

    def perform_create(self, serializer):
        change_request = serializer.save(requested_by=self.request.user)
        log_audit(self.request.user, "request_system_change", "sysops", change_request.title)
        _notify_admins_new_request(change_request)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """
        Admin accepts a pending request by setting its fee — creates a
        real Stripe (test-mode) Checkout Session for that amount and moves
        the request to PAYMENT_PENDING. The token itself is only issued
        once Stripe confirms payment via the webhook (StripeWebhookView
        below), never here — this action just hands the officer something
        to pay.
        """
        change_request = self.get_object()
        if change_request.status != SystemChangeRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be accepted."}, status=400)

        payload = SystemChangeRequestAcceptSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        fee_amount = payload.validated_data["fee_amount"]

        if not get_config_value("payments_enabled"):
            return Response({"detail": "Payments are temporarily disabled."}, status=503)

        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"detail": "Stripe is not configured (STRIPE_SECRET_KEY is unset)."}, status=500
            )
        stripe.api_key = settings.STRIPE_SECRET_KEY

        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": change_request.currency,
                        "product_data": {"name": f"System change request: {change_request.title}"},
                        # Stripe wants the amount in the currency's smallest
                        # unit (cents) — LKR is a standard 2-decimal
                        # currency for Stripe, so *100 is correct here.
                        "unit_amount": int(fee_amount * 100),
                    },
                    "quantity": 1,
                }
            ],
            # Points at the dedicated PMB Officer portal, not the shared
            # admin-shell path (/system-requests/mine) — that one is only
            # ever reached via Portal Preview now that real pmb_officer
            # sessions are redirected to /officer (see (admin)/layout.tsx),
            # and Preview never does a real payment anyway.
            success_url=f"{settings.FRONTEND_URL}/officer/system-requests/mine?payment=success",
            cancel_url=f"{settings.FRONTEND_URL}/officer/system-requests/mine?payment=cancelled",
            metadata={"system_change_request_id": str(change_request.id)},
            # Session-level metadata isn't copied onto the PaymentIntent
            # Stripe creates behind the scenes — set it here too so a
            # payment_intent.payment_failed webhook (StripeWebhookView
            # below) can trace a failed attempt back to this request.
            payment_intent_data={"metadata": {"system_change_request_id": str(change_request.id)}},
        )

        change_request.fee_amount = fee_amount
        change_request.reviewed_by = request.user
        change_request.status = SystemChangeRequest.Status.PAYMENT_PENDING
        change_request.stripe_checkout_session_id = session.id
        change_request.save(
            update_fields=["fee_amount", "reviewed_by", "status", "stripe_checkout_session_id"]
        )

        log_audit(request.user, "accept_system_change_request", "sysops", change_request.title)
        _notify_requester(
            change_request,
            request.user,
            f'Your request "{change_request.title}" was accepted — a payment of '
            f"{change_request.currency.upper()} {fee_amount} is required before a token is issued. "
            "Pay from My Requests.",
        )
        return Response(SystemChangeRequestSerializer(change_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Admin rejects a pending request outright — no payment is ever involved."""
        change_request = self.get_object()
        if change_request.status != SystemChangeRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be rejected."}, status=400)

        payload = SystemChangeRequestRejectSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        change_request.status = SystemChangeRequest.Status.REJECTED
        change_request.reviewed_by = request.user
        change_request.rejection_reason = payload.validated_data.get("reason", "")
        change_request.save(update_fields=["status", "reviewed_by", "rejection_reason"])

        log_audit(request.user, "reject_system_change_request", "sysops", change_request.title)
        _notify_requester(
            change_request,
            request.user,
            f'Your request "{change_request.title}" was rejected'
            + (f": {change_request.rejection_reason}" if change_request.rejection_reason else "."),
        )
        return Response(SystemChangeRequestSerializer(change_request).data)

    @action(detail=True, methods=["get"], url_path="checkout-url")
    def checkout_url(self, request, pk=None):
        """
        Returns a fresh checkout URL for this request's already-created
        Stripe Checkout Session — lets the requesting officer's page
        render a working "Pay Now" link without this app needing to
        persist Stripe's session URL itself (a Checkout Session retains a
        retrievable `.url` for as long as it's still open, ~24h).
        """
        change_request = self.get_object()
        if change_request.status != SystemChangeRequest.Status.PAYMENT_PENDING:
            return Response({"detail": "This request has no pending payment."}, status=400)
        if not change_request.stripe_checkout_session_id:
            return Response({"detail": "No checkout session exists for this request."}, status=400)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(change_request.stripe_checkout_session_id)
        # A Checkout Session's `.url` is only populated while it's still
        # "open" — Stripe clears it once the session is completed (paid) or
        # expires (~24h). This request's local `status` can lag behind that
        # for a few seconds until the payment webhook lands, so don't just
        # hand back a null url and let the frontend redirect() to nowhere.
        if session.status != "open":
            detail = (
                "This request may already be paid — refresh the page."
                if session.status == "complete"
                else "This payment session has expired. Contact an admin to issue a new one."
            )
            return Response({"detail": detail}, status=400)
        return Response({"url": session.url})

    @action(detail=True, methods=["post"], url_path="cancel-expired-payment")
    def cancel_expired_payment(self, request, pk=None):
        """
        Lets the requesting officer or an admin clear out a request whose
        Stripe Checkout Session has genuinely expired (~24h after
        creation, per Stripe) — moves it to REJECTED with an
        auto-generated reason, same terminal state as an admin's manual
        reject() above, but reachable by the officer too since no new
        review decision is being made here, just cleanup of a payment
        window that lapsed. Re-checks Stripe directly and only proceeds
        if the session is actually "expired" — never cancels a request
        that might still be payable or was already paid, even if this
        races the payment webhook.
        """
        change_request = self.get_object()
        if change_request.status != SystemChangeRequest.Status.PAYMENT_PENDING:
            return Response({"detail": "Only a pending payment can be cancelled."}, status=400)
        if not change_request.stripe_checkout_session_id:
            return Response({"detail": "No checkout session exists for this request."}, status=400)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(change_request.stripe_checkout_session_id)
        if session.status != "expired":
            return Response(
                {"detail": "This payment session hasn't expired yet — use Pay Now instead."},
                status=400,
            )

        change_request.status = SystemChangeRequest.Status.REJECTED
        change_request.rejection_reason = "Payment session expired."
        change_request.stripe_checkout_session_id = ""
        change_request.save(update_fields=["status", "rejection_reason", "stripe_checkout_session_id"])

        log_audit(request.user, "cancel_expired_system_change_payment", "sysops", change_request.title)
        # Skip the notification when the officer cancelled their own
        # request — they obviously already know, same as the self-service
        # withdraw actions elsewhere (e.g. purchases.withdrawRiceRequest)
        # never notify the actor about their own action.
        if request.user_id != change_request.requested_by_id:
            _notify_requester(
                change_request,
                request.user,
                f'Your request "{change_request.title}" was cancelled — its payment window expired. '
                "Submit a new request if you'd still like this change.",
            )
        return Response(SystemChangeRequestSerializer(change_request).data)

    @action(detail=True, methods=["post"], url_path="progress")
    def post_progress(self, request, pk=None):
        """
        Admin posts one progress-timeline entry against a token-issued
        request — see SystemChangeRequestProgressUpdate's docstring.
        Posting the final "deployed" stage also completes the request.
        """
        change_request = self.get_object()
        if change_request.status not in (
            SystemChangeRequest.Status.TOKEN_ISSUED,
            SystemChangeRequest.Status.IN_PROGRESS,
        ):
            return Response(
                {"detail": "Progress can only be posted once a token has been issued."}, status=400
            )

        payload = SystemChangeRequestProgressCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        stage = payload.validated_data["stage"]

        SystemChangeRequestProgressUpdate.objects.create(
            request=change_request,
            stage=stage,
            note=payload.validated_data.get("note", ""),
            updated_by=request.user,
        )

        change_request.status = (
            SystemChangeRequest.Status.COMPLETED
            if stage == SystemChangeRequestProgressUpdate.Stage.DEPLOYED
            else SystemChangeRequest.Status.IN_PROGRESS
        )
        change_request.save(update_fields=["status"])

        log_audit(
            request.user, "post_system_change_progress", "sysops", f"{change_request.title}: {stage}"
        )
        change_request.refresh_from_db()
        stage_label = SystemChangeRequestProgressUpdate.Stage(stage).label
        note = payload.validated_data.get("note", "")
        _notify_requester(
            change_request,
            request.user,
            f'Your request "{change_request.title}" progress: {stage_label}.' + (f" {note}" if note else ""),
        )
        return Response(SystemChangeRequestSerializer(change_request).data)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    POST /api/stripe/webhook/ — called directly by Stripe's servers, never
    by the frontend, so it carries no JWT and must skip this project's
    normal auth entirely; the request's authenticity is verified instead
    via Stripe's own signature header (stripe.Webhook.construct_event).
    Idempotent: a request that's already TOKEN_ISSUED (or later) is left
    untouched, since Stripe redelivers a webhook that doesn't return a 2xx
    promptly, and a checkout.session.completed event could in theory be
    redelivered after this view already handled it once.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.STRIPE_WEBHOOK_SECRET:
            return HttpResponse(status=500)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            event = stripe.Webhook.construct_event(
                request.body, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return HttpResponse(status=400)

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            change_request = SystemChangeRequest.objects.filter(
                stripe_checkout_session_id=session.get("id")
            ).first()
            if change_request and change_request.status == SystemChangeRequest.Status.PAYMENT_PENDING:
                change_request.status = SystemChangeRequest.Status.TOKEN_ISSUED
                change_request.token = secrets.token_urlsafe(24)
                change_request.token_issued_at = timezone.now()
                change_request.stripe_payment_intent_id = session.get("payment_intent") or ""
                change_request.save(
                    update_fields=[
                        "status", "token", "token_issued_at", "stripe_payment_intent_id",
                    ]
                )
                log_audit(
                    change_request.requested_by, "system_change_request_paid", "sysops",
                    change_request.title,
                )
                _notify_requester(
                    change_request,
                    change_request.reviewed_by or change_request.requested_by,
                    f'Payment received for "{change_request.title}" — your token has been issued. '
                    "Check My Requests for details.",
                )

        elif event["type"] == "payment_intent.payment_failed":
            payment_intent = event["data"]["object"]
            change_request_id = (payment_intent.get("metadata") or {}).get(
                "system_change_request_id"
            )
            change_request = (
                SystemChangeRequest.objects.filter(id=change_request_id).first()
                if change_request_id
                else None
            )
            if change_request:
                failure_message = (
                    (payment_intent.get("last_payment_error") or {}).get("message")
                    or "Unknown error."
                )
                raise_stripe_payment_failed_alert(
                    change_request, payment_intent.get("id"), failure_message
                )

        return HttpResponse(status=200)


class RunCapacityForecastsView(APIView):
    """
    POST /api/internal/run-capacity-forecasts/ — runs the
    check_capacity_forecasts management command (predictive over-capacity
    and low-stock warehouse SystemAlerts; see farmers/forecasting.py and
    sysops/utils.py's raise_low_stock_alert) on demand, meant to be called
    once a day by .github/workflows/capacity-forecast-schedule.yml since
    this codebase has no in-process task scheduler.

    Same "unauthenticated caller, secret-verified" shape as
    StripeWebhookView above — this is hit by a GitHub Actions cron job, not
    the frontend, so it carries no JWT. Deliberately runs exactly one
    hardcoded command rather than accepting a command name, so a leaked
    INTERNAL_TASK_SECRET can only ever trigger this one harmless job.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "internal_task"

    def post(self, request):
        if not settings.INTERNAL_TASK_SECRET:
            return HttpResponse(status=500)

        provided = request.META.get("HTTP_X_INTERNAL_TASK_SECRET", "")
        if not secrets.compare_digest(provided, settings.INTERNAL_TASK_SECRET):
            return HttpResponse(status=403)

        buffer = io.StringIO()
        call_command("check_capacity_forecasts", stdout=buffer)
        return Response({"output": buffer.getvalue()})
