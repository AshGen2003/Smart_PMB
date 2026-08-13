# Data models for the accounts app: the custom User model and the RBAC
# (role-based access control) building blocks (Permission, Role) that
# back the HasPermission/HasAnyPermission DRF permission classes in
# permissions.py. Every user belongs to exactly one Role, and every Role
# is a bag of Permission codenames (e.g. "manage_users", "record_purchases").
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .constants import default_officer_dashboard_widgets
from .managers import UserManager

# A user counts as "online" if their last_activity falls within this many
# minutes of now. Kept a bit above ACCESS_TOKEN_LIFETIME (15 min in
# settings.SIMPLE_JWT) so a user browsing normally (which silently
# refreshes their token) doesn't flicker offline between requests.
ONLINE_WINDOW = timedelta(minutes=3)


class Permission(models.Model):
    """
    A single named capability in the system, identified by a unique
    `codename` string (e.g. "manage_warehouses"). Permissions are attached
    to Roles via a many-to-many relationship; a user's effective
    permissions are whatever their assigned Role grants.
    """
    codename = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["codename"]

    def __str__(self):
        return self.label


class Role(models.Model):
    """
    A named group of Permissions (e.g. "Admin", "PMB Officer", "Farmer").
    Users are assigned exactly one Role, and gain whatever Permissions
    that Role has been granted.
    """
    name = models.CharField(max_length=100, unique=True)
    # Derived from name only at creation, then immutable — nothing in code
    # reads role.name, only role.slug (for "admin"/"farmer"), so keeping the
    # slug stable regardless of later renames avoids breaking those checks.
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    # Flags a built-in, seed-data role (Admin/PMB Officer/Farmer/Driver/
    # etc.) purely for the frontend's extra confirmation warning before
    # deleting one (see RolesManager.tsx) — several code paths look roles
    # up by slug (farmer self-registration, license approval, warehouse-
    # manager appointment), so deleting one of these, even with zero users
    # currently assigned, can break a feature elsewhere. Never blocks
    # renaming, permission changes, or (as of the confirmation-dialog
    # change) deletion itself — RoleViewSet.destroy only still refuses
    # when the role has users assigned (User.role is a required FK).
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(
        Permission, through="RolePermission", blank=True, related_name="roles"
    )
    # Which of OfficerDashboardPanel.tsx's fixed widget catalog (see
    # constants.py) this role's dashboard shows — lets an admin tailor the
    # officer dashboard per role from /roles without touching frontend code.
    # Defaults to every widget enabled so a newly created role looks
    # identical to today's fixed dashboard until an admin deliberately
    # edits it.
    dashboard_widgets = models.JSONField(default=default_officer_dashboard_widgets, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Only generate the slug once, on first save, from the name given
        # at creation time. Later renames do not touch the slug (see the
        # comment on the `slug` field above for why this matters).
        if not self.slug:
            self.slug = slugify(self.name).replace("-", "_")
        super().save(*args, **kwargs)


class RolePermission(models.Model):
    """
    Explicit through-model for Role.permissions, so a grant can be traced
    back to who made it and when — a bare ManyToManyField can't carry that.
    Existing grants (made before this model existed) have `granted_by=None`
    and a `granted_date` backfilled to the time this model was introduced;
    only grants made from here on have real attribution.
    """

    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    granted_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("role", "permission")


class User(AbstractUser):
    """
    Custom user model for the system. Extends Django's AbstractUser but
    replaces the username-based login with email-based login, uses a UUID
    primary key instead of an auto-incrementing integer, and adds the
    fields needed for RBAC (role) and login-lockout tracking
    (failed_login_attempts, locked_until) used during JWT authentication.
    """
    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    email_confirmed = models.BooleanField(default=True)
    nic = models.CharField(max_length=20, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/", null=True, blank=True
    )
    # Number of consecutive failed login attempts since the last successful
    # login; reset to 0 on success. Compared against a configurable
    # threshold (see sysops.utils.get_config_value) to decide when to lock.
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    # When set to a future timestamp, login is blocked until that time
    # passes. Managed by CustomTokenObtainPairSerializer in serializers.py.
    locked_until = models.DateTimeField(null=True, blank=True)
    # Stamped on every authenticated request by UpdateLastActivityMiddleware
    # (accounts/middleware.py) — the basis for "currently online" counts,
    # since JWT auth is stateless and has no server-side session to query.
    last_activity = models.DateTimeField(null=True, blank=True)
    # Set whenever an admin creates the account (or resets its password)
    # with a system-generated temporary password — the frontend forces a
    # password change before letting the user reach any real page while
    # this is true. Cleared automatically the moment they set their own
    # new password (see SelfProfileSerializer.save()).
    must_change_password = models.BooleanField(default=False)
    # User-controlled preference (Settings → Notifications): whether the
    # notification bell polls for and alerts on new messages/requests. Off
    # just mutes the alert — sending/reading messages via /messages still
    # works regardless.
    notify_in_app_messages = models.BooleanField(default=True)

    # Log in with email + password instead of Django's default username.
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_online(self):
        return bool(self.last_activity) and timezone.now() - self.last_activity <= ONLINE_WINDOW


class PmbOfficer(models.Model):
    """
    A PMB Officer's staff profile: employment details linked one-to-one to
    a User account with role "pmb_officer". Unlike Farmer/Mill, this is
    never self-registered — officer accounts are always created by an
    admin via User Management (see AdminUserWriteSerializer.create/update
    in serializers.py, which creates/updates this profile whenever the
    assigned role is "pmb_officer").
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pmb_officer_profile"
    )
    employee_no = models.CharField(max_length=50, unique=True)
    nic = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    district = models.ForeignKey(
        "farmers.District", on_delete=models.SET_NULL, null=True, blank=True, related_name="pmb_officers"
    )
    location = models.CharField(max_length=255, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    joined_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.employee_no} ({self.user.full_name})"


class LicenseApplication(models.Model):
    """
    A request from an external party (an authorized purchaser or mill
    owner — not an employee) to be licensed as part of the organization.
    Unlike a farmer, self-registering isn't enough on its own: the account
    exists and can log in immediately, but only reaches real access once an
    officer/admin reviews and approves this application (see
    LicenseApplicationViewSet). Confirming email and getting the license
    approved are independent gates — both must pass.
    """

    class LicenseType(models.TextChoices):
        AUTHORIZED_PURCHASER = "authorized_purchaser", "Authorized Purchaser"
        MILL_OWNER = "mill_owner", "Mill Owner"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="license_application"
    )
    license_type = models.CharField(max_length=30, choices=LicenseType.choices)
    business_name = models.CharField(max_length=150)
    business_registration_no = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_license_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    # Shown to the applicant on their pending-approval holding screen when rejected.
    rejection_reason = models.TextField(blank=True)
    # Supporting business registration document, uploadable by the
    # applicant from their pending-approval holding screen while the
    # application is still pending — see LicenseApplicationDocumentView.
    document = models.FileField(upload_to="license_application_documents/%Y/%m/", null=True, blank=True)
    # Assigned once, the moment an officer approves this application (see
    # LicenseApplicationViewSet.approve) — never reassigned afterward, even
    # if the application is later re-reviewed. Printed on the downloadable
    # digital license certificate (see accounts/pdf.py).
    license_number = models.CharField(max_length=40, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.business_name} ({self.get_license_type_display()}) — {self.status}"


class PasswordResetOTP(models.Model):
    """
    A one-time code issued for the self-service forgot-password flow (see
    ForgotPasswordView/VerifyResetOTPView in views.py). `code_hash` is
    hashed the same way a password is (never stored in plain text) —
    `check_password(entered_code, otp.code_hash)` verifies it. Only the
    newest unconsumed code for a given user is ever valid; requesting a
    new one invalidates whatever came before it.
    """

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="password_reset_otps"
    )
    code_hash = models.CharField(max_length=128)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    # Wrong-code guesses against *this* row — capped in VerifyResetOTPView
    # so a 6-digit code (1 in a million) can't just be brute-forced.
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"OTP for {self.user.email} via {self.channel} ({'consumed' if self.consumed_at else 'active'})"


class Message(models.Model):
    """
    A message between two users, surfaced via the notification bell in the
    navbar. `recipient` being null means a "request" addressed to a whole
    role rather than one specific staff member — `target_role` says which
    (Admin or PMB Officer) — and is visible only to accounts with that
    role, since any of them may be the one to triage it. Farmers/drivers
    may only create messages with recipient=null + a target_role (see
    MessageCreateSerializer); only staff can address a message to a
    specific user, in which case target_role stays unset.
    """

    class TargetRole(models.TextChoices):
        ADMIN = "admin", "Admin"
        PMB_OFFICER = "pmb_officer", "PMB Officer"

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_messages", null=True, blank=True
    )
    target_role = models.CharField(
        max_length=20, choices=TargetRole.choices, null=True, blank=True
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
