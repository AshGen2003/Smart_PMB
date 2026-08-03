# API views for authentication (login/logout/refresh), farmer
# self-registration, email confirmation, the logged-in user's own profile,
# and admin-facing management of users/roles/permissions. Login and token
# refresh are handled by djangorestframework_simplejwt; everything else is
# plain DRF APIViews/ViewSets guarded by the custom permission classes in
# accounts/permissions.py.
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from sysops.utils import get_config_value, log_audit, log_auth

from .emails import (
    send_confirmation_email,
    send_impersonation_notice_email,
    send_license_decision_email,
    send_otp_email,
    send_temp_password_email,
)
from .models import ONLINE_WINDOW, LicenseApplication, Message, PasswordResetOTP, Permission, Role, User
from .otp import MAX_OTP_ATTEMPTS, OTP_EXPIRY_MINUTES, generate_otp_code
from .permissions import HasPermission, RoleAccessPermission
from .serializers import (
    AdminUserSerializer,
    AdminUserWriteSerializer,
    CustomTokenObtainPairSerializer,
    LicenseApplicationSerializer,
    LicenseDecisionSerializer,
    MessageCreateSerializer,
    MessageRecipientSerializer,
    MessageSerializer,
    PermissionSerializer,
    RegisterFarmerSerializer,
    RegisterLicenseApplicantSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    SelfProfileSerializer,
    generate_temp_password,
    get_effective_phone_number,
    notify_officers,
)
from .sms import send_otp_sms
from .tokens import read_email_confirmation_token


class LoginView(TokenObtainPairView):
    """
    Login endpoint: exchanges email+password for a JWT access+refresh
    token pair. Delegates the actual credential/lockout checking to
    CustomTokenObtainPairSerializer. Rate-limited via the "login" throttle
    scope to slow down brute-force attempts.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterFarmerView(APIView):
    """Public self-registration endpoint for new farmers; creates a User + Farmer profile and emails a confirmation link."""
    permission_classes = [AllowAny]

    def post(self, request):
        if not get_config_value("signups_enabled"):
            return Response({"detail": "New signups are temporarily disabled."}, status=503)

        serializer = RegisterFarmerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = result["user"]

        send_confirmation_email(user)

        return Response(
            {
                "detail": "Account created. Check your email to confirm your account before logging in."
            },
            status=status.HTTP_201_CREATED,
        )


class RegisterLicenseApplicantView(APIView):
    """
    Public self-registration endpoint for authorized purchasers and mill
    owners; creates a User + pending LicenseApplication and emails a
    confirmation link. Unlike farmers, this account still needs an
    officer/admin to approve the application before it reaches real access
    (see LicenseApplicationViewSet) — the frontend shows a pending/rejected
    holding screen in the meantime.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not get_config_value("signups_enabled"):
            return Response({"detail": "New signups are temporarily disabled."}, status=503)

        serializer = RegisterLicenseApplicantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = result["user"]

        send_confirmation_email(user)

        return Response(
            {
                "detail": (
                    "Application submitted. Check your email to confirm your "
                    "account, then wait for an officer to review your application "
                    "before logging in."
                )
            },
            status=status.HTTP_201_CREATED,
        )


class ConfirmEmailView(APIView):
    """Consumes the signed token from the confirmation email and marks the account's email as confirmed."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Missing confirmation token."}, status=400)

        try:
            uid = read_email_confirmation_token(token)
        except signing.SignatureExpired:
            return Response(
                {"detail": "This confirmation link has expired."}, status=400
            )
        except signing.BadSignature:
            return Response(
                {"detail": "This confirmation link is invalid."}, status=400
            )

        try:
            user = User.objects.get(pk=uid)
        except User.DoesNotExist:
            return Response(
                {"detail": "This confirmation link is invalid."}, status=400
            )

        if not user.email_confirmed:
            user.email_confirmed = True
            user.save(update_fields=["email_confirmed"])

        return Response({"detail": "Email confirmed. You can now log in."})


class ForgotPasswordView(APIView):
    """
    Public self-service password-reset request: sends a one-time code via
    the caller's chosen channel (email or SMS to whatever contact number is
    on file — see get_effective_phone_number) if the given address belongs
    to an account. Always responds with the same generic message
    regardless of whether the account exists or has a phone on file for
    the "sms" channel — the one flow in this app worth guarding against
    enumeration, since it's the one most commonly targeted for it.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    GENERIC_RESPONSE = {
        "detail": "If that account exists, we've sent a reset code to it."
    }

    def post(self, request):
        email = request.data.get("email", "")
        channel = request.data.get("channel", "email")
        if channel not in (PasswordResetOTP.Channel.EMAIL, PasswordResetOTP.Channel.SMS):
            return Response({"detail": "Invalid channel."}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            # Only the newest code is ever valid — burn whatever came before.
            PasswordResetOTP.objects.filter(user=user, consumed_at__isnull=True).delete()

            code = generate_otp_code()
            PasswordResetOTP.objects.create(
                user=user,
                code_hash=make_password(code),
                channel=channel,
                expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
            )

            if channel == PasswordResetOTP.Channel.EMAIL:
                send_otp_email(user, code)
            else:
                phone = get_effective_phone_number(user)
                if phone:
                    send_otp_sms(phone, code)
                # No phone on file: silently do nothing — same
                # anti-enumeration reasoning as the generic response below.

        return Response(self.GENERIC_RESPONSE)


class VerifyResetOTPView(APIView):
    """Verifies the one-time code from ForgotPasswordView and sets the account's new password."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = request.data.get("email", "")
        code = request.data.get("code", "")
        new_password = request.data.get("new_password", "")

        if not code:
            return Response({"detail": "Missing reset code."}, status=400)
        if len(new_password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."}, status=400
            )

        user = User.objects.filter(email__iexact=email).first()
        otp = (
            PasswordResetOTP.objects.filter(user=user, consumed_at__isnull=True).first()
            if user else None
        )
        if not otp or otp.expires_at < timezone.now():
            return Response(
                {"detail": "This code is invalid or has expired. Request a new one."}, status=400
            )

        if otp.attempts >= MAX_OTP_ATTEMPTS:
            otp.consumed_at = timezone.now()
            otp.save(update_fields=["consumed_at"])
            return Response(
                {"detail": "Too many incorrect attempts. Request a new code."}, status=400
            )

        if not check_password(code, otp.code_hash):
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            remaining = MAX_OTP_ATTEMPTS - otp.attempts
            return Response(
                {"detail": f"Incorrect code. {remaining} attempt(s) remaining."}, status=400
            )

        user.set_password(new_password)
        # Mirrors SelfProfileSerializer.save(): setting your own new password
        # clears the forced-change flag, same as the logged-in Settings flow.
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])

        otp.consumed_at = timezone.now()
        otp.save(update_fields=["consumed_at"])

        return Response({"detail": "Password reset. You can now log in with your new password."})


class LogoutView(APIView):
    """Logs the user out by blacklisting their refresh token so it can no longer be used to mint new access tokens."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                # Token may already be invalid/expired/blacklisted; logout
                # should still succeed either way from the client's view.
                pass
        log_auth(request, "logout", user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Lets the logged-in user view (GET) and edit (PATCH) their own profile, including changing their password."""
    permission_classes = [IsAuthenticated]

    def _profile_picture_url(self, request, user):
        # Build a full absolute URL (not just the relative media path) so
        # the frontend can use it directly as an <img src>.
        if not user.profile_picture:
            return None
        return request.build_absolute_uri(user.profile_picture.url)

    def _notification_prefs(self, user):
        # notify_harvest_updates/notify_via_sms only exist on farmer_profile,
        # so they're None (and the frontend hides those toggles) for every
        # other role.
        farmer_profile = getattr(user, "farmer_profile", None)
        return {
            "notify_in_app_messages": user.notify_in_app_messages,
            "notify_harvest_updates": (
                farmer_profile.notify_harvest_updates if farmer_profile else None
            ),
            "notify_via_sms": (
                farmer_profile.notify_via_sms if farmer_profile else None
            ),
        }

    def _account_status(self, user):
        # license_application only exists for authorized_purchaser/mill_owner
        # accounts — None (no gating) for everyone else. The frontend shows
        # a pending/rejected holding screen instead of the real portal
        # unless status is "approved".
        application = getattr(user, "license_application", None)
        return {
            "must_change_password": user.must_change_password,
            "license_status": application.status if application else None,
            "license_rejection_reason": (
                application.rejection_reason if application else ""
            ),
            "license_business_name": application.business_name if application else "",
            "license_type_display": (
                application.get_license_type_display() if application else ""
            ),
        }

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "nic": user.nic,
                "phone_number": user.phone_number,
                "profile_picture": self._profile_picture_url(request, user),
                "role": user.role.slug,
                "role_name": user.role.name,
                "permissions": list(
                    user.role.permissions.values_list("codename", flat=True)
                ),
                "dashboard_widgets": list(user.role.dashboard_widgets),
                **self._notification_prefs(user),
                **self._account_status(user),
            }
        )

    def patch(self, request):
        serializer = SelfProfileSerializer(
            data=request.data, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Issue a fresh token pair so any claims baked into the JWT (full
        # name, etc.) reflect the just-saved changes immediately, without
        # requiring the frontend to force a re-login.
        token = CustomTokenObtainPairSerializer.get_token(user)

        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "nic": user.nic,
                "phone_number": user.phone_number,
                "profile_picture": self._profile_picture_url(request, user),
                "role": user.role.slug,
                "role_name": user.role.name,
                "permissions": list(
                    user.role.permissions.values_list("codename", flat=True)
                ),
                "dashboard_widgets": list(user.role.dashboard_widgets),
                **self._notification_prefs(user),
                **self._account_status(user),
                "access": str(token.access_token),
                "refresh": str(token),
            }
        )


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD over all user accounts (requires "manage_users"), plus two
    extra actions for account-security intervention: forcibly unlocking a
    locked-out account and revoking all of a user's active sessions. Every
    mutation is recorded to the audit log via sysops.utils.log_audit.
    """
    permission_classes = [HasPermission("manage_users")]
    queryset = (
        User.objects.all()
        .select_related("role", "farmer_profile", "pmb_officer_profile")
        .order_by("-date_joined")
    )

    def get_queryset(self):
        # Optional ?role=<slug> filter for the admin user list screen.
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role__slug=role)
        return qs

    def get_serializer_class(self):
        # Reads use a serializer that nests role details and computed
        # fields (is_locked); writes use a flatter serializer that accepts
        # a plain role id and an optional password.
        if self.action in ("create", "update", "partial_update"):
            return AdminUserWriteSerializer
        return AdminUserSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            # Prevent an admin from locking themselves out by deleting
            # their own account through this endpoint.
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email = instance.email
        response = super().destroy(request, *args, **kwargs)
        log_audit(request.user, "delete_user", "accounts", email)
        return response

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit(self.request.user, "create_user", "accounts", user.email)
        # Always set on create by AdminUserWriteSerializer (typed or
        # auto-generated password, either way "temporary" — see there).
        send_temp_password_email(user, user._plain_password)
        # Unlike a self-registered applicant, an admin-created purchaser/
        # mill-owner account skips the licensing queue entirely (creating it
        # directly already IS the approval) — but the rest of the team
        # would otherwise have no way of knowing the account exists at all.
        if user.role.slug in ("authorized_purchaser", "mill_owner"):
            notify_officers(
                user,
                f"New {user.role.name} account created for {user.full_name or user.email} "
                "(no licensing application — created directly by an admin).",
            )

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit(self.request.user, "update_user", "accounts", user.email)

    @action(detail=True, methods=["post"], permission_classes=[HasPermission("manage_system")])
    def unlock(self, request, pk=None):
        """Admin override to lift a login lockout early instead of waiting for it to expire."""
        user = self.get_object()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=["failed_login_attempts", "locked_until"])
        log_audit(request.user, "unlock_account", "accounts", user.email)
        return Response(AdminUserSerializer(user).data)

    @action(
        detail=True, methods=["post"], url_path="force-logout",
        permission_classes=[HasPermission("manage_system")],
    )
    def force_logout(self, request, pk=None):
        """Blacklists every outstanding refresh token for this user, ending all of their active sessions immediately."""
        user = self.get_object()
        for outstanding in OutstandingToken.objects.filter(user=user):
            try:
                RefreshToken(outstanding.token).blacklist()
            except Exception:
                # Ignore tokens that are already invalid/expired/blacklisted.
                pass
        log_audit(request.user, "force_logout", "accounts", user.email)
        return Response({"detail": "Session revoked."})

    @action(
        detail=True, methods=["post"], url_path="reset-password",
        permission_classes=[HasPermission("manage_system")],
    )
    def reset_password(self, request, pk=None):
        """
        Admin-triggered password reset: always a fresh system-generated
        temporary password, emailed to the user, who must change it on next
        login — same shape as account creation's temp-password flow, never
        an admin-chosen one. Replaces the old "type a new password into the
        edit form" path entirely (see AdminUserWriteSerializer.update).
        """
        user = self.get_object()
        temp_password = generate_temp_password()
        user.set_password(temp_password)
        user.must_change_password = True
        user.save(update_fields=["password", "must_change_password"])
        send_temp_password_email(user, temp_password)
        log_audit(request.user, "reset_password", "accounts", user.email)
        return Response({"detail": "Password reset. A temporary password has been emailed to the user."})

    @action(
        detail=True, methods=["post"],
        permission_classes=[HasPermission("impersonate_users")],
    )
    def impersonate(self, request, pk=None):
        """
        Mints a real JWT pair for the target user, so the caller genuinely
        becomes that account (subject to the safety rails below) — distinct
        from Portal Preview, which only ever swaps in sample data over the
        admin's own real session. Scoped to "see what a non-admin user
        sees": impersonating a superuser, another admin-role account, or
        yourself is rejected outright, so this can't be used to chain
        privilege or cover tracks between equally-privileged accounts.
        """
        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "You can't impersonate yourself."}, status=400)
        if user.is_superuser:
            return Response({"detail": "Cannot impersonate a superuser account."}, status=400)
        if user.role_id and user.role.slug == "admin":
            return Response({"detail": "Cannot impersonate another admin account."}, status=400)

        token = CustomTokenObtainPairSerializer.get_token(user)
        log_audit(
            request.user, "start_impersonation", "accounts",
            f"as {user.email} ({user.id})",
        )
        # Transparency notice to the impersonated account itself — the audit
        # log above is only ever visible to other admins, so without this
        # the account holder would have no way of knowing an admin was ever
        # signed in as them. In-app (shows on their notification bell right
        # away) and email (reaches them even if they're not logged in).
        Message.objects.create(
            sender=request.user,
            recipient=user,
            body=(
                f"An administrator ({request.user.email}) signed in as your "
                "account for support or troubleshooting purposes just now."
            ),
        )
        send_impersonation_notice_email(user, request.user.email)
        return Response({"access": str(token.access_token), "refresh": str(token)})


class LicenseApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Officer/admin review queue for authorized-purchaser/mill-owner
    self-registrations (requires the pre-seeded "approve_licenses"
    permission — already granted to admin/pmb_officer by default, see
    accounts/migrations/0003_role_permission.py). Read-only aside from the
    approve/reject actions, since an application's own fields are set once
    at self-registration and never edited afterward.
    """
    permission_classes = [HasPermission("approve_licenses")]
    serializer_class = LicenseApplicationSerializer
    queryset = (
        LicenseApplication.objects.all()
        .select_related("user", "reviewed_by")
        .order_by("-submitted_at")
    )

    def get_queryset(self):
        # Optional ?status=pending filter for the review queue's default view.
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        application = self.get_object()
        application.status = LicenseApplication.Status.APPROVED
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.rejection_reason = ""
        application.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        log_audit(request.user, "approve_license", "accounts", application.business_name)
        send_license_decision_email(application)
        return Response(LicenseApplicationSerializer(application).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        serializer = LicenseDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application = self.get_object()
        application.status = LicenseApplication.Status.REJECTED
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.rejection_reason = serializer.validated_data.get("reason", "")
        application.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        log_audit(request.user, "reject_license", "accounts", application.business_name)
        send_license_decision_email(application)
        return Response(LicenseApplicationSerializer(application).data)


class RoleViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD over Roles and the permissions assigned to them. Access is
    gated by RoleAccessPermission (read access is broader than write
    access — see that class's docstring). A role still assigned to at
    least one user can never be deleted (User.role is a required FK) —
    system-seeded roles (is_system=True) have no extra deletion block
    beyond that; the frontend just shows an additional warning before
    deleting one, since several code paths look roles up by slug (see
    Role.is_system's docstring in models.py).
    """
    permission_classes = [RoleAccessPermission]
    queryset = Role.objects.all().prefetch_related("permissions").order_by("name")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return RoleWriteSerializer
        return RoleSerializer

    def perform_create(self, serializer):
        role = serializer.save()
        log_audit(self.request.user, "create_role", "accounts", role.name)

    def perform_update(self, serializer):
        role = serializer.save()
        log_audit(self.request.user, "update_role", "accounts", role.name)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.users.exists():
            # Deleting a role out from under assigned users would break
            # the required (non-nullable) User.role foreign key.
            return Response(
                {"detail": "This role is still assigned to one or more users."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = instance.name
        response = super().destroy(request, *args, **kwargs)
        log_audit(request.user, "delete_role", "accounts", name)
        return response


class PermissionListView(APIView):
    """Read-only catalogue of all Permission codenames, used to populate the role-editing UI's permission checklist."""
    permission_classes = [RoleAccessPermission]

    def get(self, request):
        permissions = Permission.objects.all().order_by("codename")
        return Response(PermissionSerializer(permissions, many=True).data)


class AdminOverviewView(APIView):
    """Aggregate stats for the admin dashboard: user/role counts, per-role membership breakdown, and recently joined users."""
    permission_classes = [HasPermission("manage_users")]

    def get(self, request):
        roles = Role.objects.annotate(member_count=Count("users")).order_by(
            "-member_count"
        )
        recent_users = User.objects.select_related("role").order_by(
            "-date_joined"
        )[:5]

        return Response(
            {
                "total_users": User.objects.count(),
                "active_users": User.objects.filter(is_active=True).count(),
                "total_roles": roles.count(),
                "role_breakdown": [
                    {
                        "name": r.name,
                        "slug": r.slug,
                        "user_count": r.member_count,
                    }
                    for r in roles
                ],
                "recent_users": [
                    {
                        "id": str(u.id),
                        "email": u.email,
                        "full_name": u.full_name,
                        "role_name": u.role.name,
                        "date_joined": u.date_joined,
                        "is_active": u.is_active,
                    }
                    for u in recent_users
                ],
            }
        )


class OnlineRolesView(APIView):
    """
    Per-role breakdown of users currently "online" (their last authenticated
    request fell within models.ONLINE_WINDOW). Deliberately small/cheap so
    the frontend can poll it every few seconds for a near-real-time count
    without the cost of the full AdminOverviewView payload.
    """
    permission_classes = [HasPermission("manage_users")]

    def get(self, request):
        cutoff = timezone.now() - ONLINE_WINDOW
        role_counts = list(
            User.objects.filter(last_activity__gte=cutoff)
            .values("role__name", "role__slug")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        # Every online user has exactly one role, so the total is just the
        # sum of the per-role breakdown — no need for a second `.count()`
        # query against the same filter (the DB is remote, so every avoided
        # round trip matters here; this endpoint is polled every few seconds).

        return Response(
            {
                "generated_at": timezone.now(),
                "online_total": sum(r["count"] for r in role_counts),
                "roles": [
                    {"name": r["role__name"], "slug": r["role__slug"], "count": r["count"]}
                    for r in role_counts
                ],
            }
        )


# Messages relevant to a given user: their own direct messages, plus — for
# Admin/PMB Officer accounts specifically — every unaddressed request
# (recipient=None) targeted at *their* role. A request addressed to Admin
# is only visible to Admins, one addressed to PMB Officer only to PMB
# Officers — not to every staff account, unlike before target_role existed.
# Shared by MessageInboxView and MessageMarkReadView so the two can't drift.
def _visible_messages(user):
    qs = Message.objects.select_related("sender", "sender__role", "recipient")
    if user.role.slug in ("admin", "pmb_officer"):
        return qs.filter(Q(recipient=user) | Q(recipient__isnull=True, target_role=user.role.slug))
    return qs.filter(recipient=user)


class MessageInboxView(generics.ListAPIView):
    """
    GET /api/messages/inbox/ — messages for the notification bell. Capped
    to the most recent 50 so a long-lived shared admin inbox can't blow up
    the payload. For a full, paginated history see MessageHistoryView.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        return _visible_messages(self.request.user)[:50]


class MessageHistoryPagination(PageNumberPagination):
    page_size = 20


class MessageHistoryView(generics.ListAPIView):
    """
    GET /api/messages/history/ — full, paginated message history behind
    the notification bell's "View all" link. Same visibility rules as the
    inbox (see `_visible_messages`) but without the 50-item cap, and with
    an optional `?unread=1` filter for the history page's "Unread only" tab.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = MessageHistoryPagination

    def get_queryset(self):
        qs = _visible_messages(self.request.user)
        if self.request.query_params.get("unread") == "1":
            qs = qs.filter(is_read=False)
        return qs


class MessageCreateView(generics.CreateAPIView):
    """
    POST /api/messages/ — send a message. `sender` is always the
    authenticated user; `recipient` is either a specific user (staff only)
    or null (a request to the admin/officer team, allowed for anyone).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MessageCreateSerializer

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class MessageMarkReadView(APIView):
    """
    POST /api/messages/<pk>/read/ — marks a message read. Scoped through
    `_visible_messages` so a user can only mark messages they're actually
    allowed to see; a shared (recipient=null) request-to-admin message is
    marked read for everyone once any staff member has seen it.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        message = get_object_or_404(_visible_messages(request.user), pk=pk)
        message.is_read = True
        message.save(update_fields=["is_read"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageRecipientsView(generics.ListAPIView):
    """
    GET /api/messages/recipients/ — user picker for composing a direct
    message. Open to any staff (non-farmer, non-driver) account rather
    than gated on manage_users, since PMB Officers need to message farmers
    too; farmers and drivers get an empty list since they can only message
    the admin team, not a specific user (see MessageCreateSerializer).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = MessageRecipientSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role.slug in ("farmer", "driver"):
            return User.objects.none()
        return User.objects.exclude(id=user.id).select_related("role").order_by("full_name")
