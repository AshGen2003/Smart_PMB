# Serializers for the accounts app: JWT login (with failed-login lockout
# logic), farmer self-registration, self-service profile editing, and the
# admin-facing user/role/permission management endpoints.
import random
import secrets
import string
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from farmers.models import District, Farmer
from mills.models import Mill
from purchases.models import AuthorizedPurchaser
from sysops.utils import get_config_value, log_auth, raise_repeated_login_failure_alert

from .constants import OFFICER_DASHBOARD_WIDGETS
from .models import LicenseApplication, Message, Permission, PmbOfficer, Role, User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends simplejwt's default login serializer to:
      1. embed the user's role/permissions/name/email as extra JWT claims
         (so the frontend can render role-aware UI without an extra API
         call), and
      2. enforce account lockout after repeated failed login attempts,
         with thresholds read at runtime from SystemConfig via
         sysops.utils.get_config_value, and
      3. block login for accounts that haven't confirmed their email yet.
    Every attempt (success, failure, lockout) is written to the AuthLog via
    sysops.utils.log_auth.
    """

    @classmethod
    def get_token(cls, user):
        # Bake role/permission info directly into the JWT payload so the
        # frontend can read it client-side without a round trip to /me/.
        token = super().get_token(user)
        token["role"] = user.role.slug
        token["role_name"] = user.role.name
        token["permissions"] = list(
            user.role.permissions.values_list("codename", flat=True)
        )
        token["full_name"] = user.full_name
        token["email"] = user.email
        return token

    def validate(self, attrs):
        request = self.context.get("request")
        email = attrs.get(self.username_field)
        user = User.objects.filter(email__iexact=email).first() if email else None

        # If the account is currently locked, reject immediately without
        # even checking the password, so we don't leak whether the
        # password was correct while locked, and don't reset the lock.
        if user and user.locked_until and user.locked_until > timezone.now():
            minutes_left = max(
                1, int((user.locked_until - timezone.now()).total_seconds() // 60) + 1
            )
            if request:
                log_auth(request, "login_failed", user=user)
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Too many failed login attempts. Try again in "
                        f"{minutes_left} minute{'s' if minutes_left != 1 else ''}."
                    )
                }
            )

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            # Wrong password (or unknown email). If it's a known user,
            # bump their failure counter and, once it crosses the
            # configured threshold, lock the account for
            # login_lockout_minutes and reset the counter so the next
            # attempt after the lockout window starts counting fresh.
            if user:
                threshold = get_config_value("login_lockout_threshold")
                lockout_minutes = get_config_value("login_lockout_minutes")
                user.failed_login_attempts += 1
                locked_now = user.failed_login_attempts >= threshold
                if locked_now:
                    user.locked_until = timezone.now() + timedelta(minutes=lockout_minutes)
                    user.failed_login_attempts = 0
                else:
                    # Only an early-warning heads-up for streaks still short
                    # of the actual lockout threshold — once locked_now is
                    # True the counter is reset above, so this deliberately
                    # doesn't fire again on the same request.
                    raise_repeated_login_failure_alert(user)
                user.save(update_fields=["failed_login_attempts", "locked_until"])
                if request:
                    log_auth(
                        request,
                        "account_locked" if locked_now else "login_failed",
                        user=user,
                    )
            elif request:
                # Unknown email: still log the attempt, but there's no
                # user record to attach a lockout counter to.
                log_auth(request, "login_failed", email=email or "")
            raise

        # Successful login: clear any lingering failure count/lockout from
        # past attempts.
        if user.failed_login_attempts or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save(update_fields=["failed_login_attempts", "locked_until"])

        if not self.user.email_confirmed:
            raise serializers.ValidationError(
                {"detail": "Please confirm your email address before logging in."}
            )

        if request:
            log_auth(request, "login_success", user=user)
        return data


class RegisterFarmerSerializer(serializers.Serializer):
    """Validates and creates a new farmer's User account plus matching Farmer profile in one transaction."""

    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    name = serializers.CharField(max_length=100)
    nic = serializers.CharField(max_length=20)
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    district_id = serializers.IntegerField()
    land_size = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_nic(self, value):
        if Farmer.objects.filter(nic=value).exists():
            raise serializers.ValidationError("An account with this NIC already exists.")
        return value

    def validate_district_id(self, value):
        if not District.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Select a valid district.")
        return value

    def create(self, validated_data):
        district = District.objects.select_related("province").get(
            pk=validated_data["district_id"]
        )
        # Human-friendly registration number, e.g. "FRM-2026-483920".
        # Not guaranteed globally unique (random suffix), but collisions
        # are astronomically unlikely at this scale.
        registration_no = f"FRM-{timezone.now().year}-{random.randint(100000, 999999)}"

        # Wrap both creates in one transaction: if creating the Farmer
        # profile fails, the User account must not be left dangling
        # without one.
        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                full_name=validated_data["name"],
                role=Role.objects.get(slug="farmer"),
                email_confirmed=False,
            )
            farmer = Farmer.objects.create(
                user=user,
                registration_no=registration_no,
                name=validated_data["name"],
                nic=validated_data["nic"],
                district=district,
                province=district.province,
                land_size=validated_data.get("land_size"),
                contact_number=validated_data.get("contact_number", ""),
            )

        return {"user": user, "farmer": farmer}


def notify_officers(sender, body):
    """
    Sends an in-app request (notification bell) to both the admin and
    pmb_officer teams — reused for both self-registered licensing
    applications and admin-created purchaser/mill-owner accounts, so
    neither team ever finds out about a new account only by happening to
    check /licenses or /residents. Both are notified since both hold
    approve_licenses, but pmb_officer additionally lacks view_audit_logs
    (so a SystemAlert-based notice would have missed them entirely).
    """
    for target_role in (Message.TargetRole.ADMIN, Message.TargetRole.PMB_OFFICER):
        Message.objects.create(sender=sender, target_role=target_role, body=body)


class RegisterLicenseApplicantSerializer(serializers.Serializer):
    """
    Validates and creates a new authorized-purchaser/mill-owner User account
    plus a pending LicenseApplication, in one transaction. Unlike a farmer,
    this account can log in right away but only reaches real access once an
    officer/admin approves the application (see LicenseApplicationViewSet)
    — confirming email is a separate, independent gate on top of that, same
    as farmer self-registration.
    """

    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=150)
    license_type = serializers.ChoiceField(choices=LicenseApplication.LicenseType.choices)
    business_name = serializers.CharField(max_length=150)
    business_registration_no = serializers.CharField(max_length=50)
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    # Mill-only fields below — required when license_type == "mill_owner" so
    # a real Mill profile (see mills/models.py) can be created alongside the
    # account, ready to use the moment the LicenseApplication is approved.
    # Left blank/omitted for authorized_purchaser applicants, who have no
    # equivalent profile model (purchases/models.py's RiceRequest/
    # PurchaserStock reference the User directly).
    nic = serializers.CharField(max_length=20, required=False, allow_blank=True)
    district_id = serializers.IntegerField(required=False, allow_null=True)
    capacity_mt_per_day = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["license_type"] == LicenseApplication.LicenseType.MILL_OWNER:
            if not attrs.get("nic"):
                raise serializers.ValidationError({"nic": "NIC is required for a mill owner application."})
            if Mill.objects.filter(nic=attrs["nic"]).exists():
                raise serializers.ValidationError({"nic": "An account with this NIC already exists."})
            district_id = attrs.get("district_id")
            if not district_id or not District.objects.filter(pk=district_id).exists():
                raise serializers.ValidationError({"district_id": "Select a valid district."})
        elif attrs.get("district_id") and not District.objects.filter(pk=attrs["district_id"]).exists():
            # Authorized purchasers may optionally pick a district (unlike
            # mill owners, it's not required — a purchaser's operating area
            # is less tied to a single physical location), but if one was
            # sent it must be real.
            raise serializers.ValidationError({"district_id": "Select a valid district."})
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                full_name=validated_data["full_name"],
                role=Role.objects.get(slug=validated_data["license_type"]),
                email_confirmed=False,
            )
            application = LicenseApplication.objects.create(
                user=user,
                license_type=validated_data["license_type"],
                business_name=validated_data["business_name"],
                business_registration_no=validated_data["business_registration_no"],
                contact_number=validated_data.get("contact_number", ""),
            )

            if validated_data["license_type"] == LicenseApplication.LicenseType.MILL_OWNER:
                district = District.objects.select_related("province").get(
                    pk=validated_data["district_id"]
                )
                Mill.objects.create(
                    user=user,
                    registration_no=f"MIL-{timezone.now().year}-{random.randint(100000, 999999)}",
                    mill_name=validated_data["business_name"],
                    owner_name=validated_data["full_name"],
                    nic=validated_data["nic"],
                    business_reg_no=validated_data["business_registration_no"],
                    district=district,
                    province=district.province,
                    capacity_mt_per_day=validated_data.get("capacity_mt_per_day"),
                    contact_number=validated_data.get("contact_number", ""),
                )
            elif validated_data["license_type"] == LicenseApplication.LicenseType.AUTHORIZED_PURCHASER:
                district_id = validated_data.get("district_id")
                AuthorizedPurchaser.objects.create(
                    user=user,
                    organization=validated_data["business_name"],
                    reg_number=validated_data["business_registration_no"],
                    district_id=district_id,
                    phone=validated_data.get("contact_number", ""),
                )

            notify_officers(
                user,
                f"New licensing application from {application.business_name} "
                f"({application.get_license_type_display()}) — awaiting review.",
            )

        return {"user": user, "application": application}


class LicenseApplicationSerializer(serializers.ModelSerializer):
    """Read-only representation of a licensing application for the officer/admin approval queue."""

    applicant_name = serializers.CharField(source="user.full_name", read_only=True)
    applicant_email = serializers.CharField(source="user.email", read_only=True)
    license_type_display = serializers.CharField(source="get_license_type_display", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LicenseApplication
        fields = [
            "id", "applicant_name", "applicant_email", "license_type",
            "license_type_display", "business_name", "business_registration_no",
            "contact_number", "status", "submitted_at", "reviewed_by_name",
            "reviewed_at", "rejection_reason",
        ]

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.full_name if obj.reviewed_by else None


class LicenseDecisionSerializer(serializers.Serializer):
    """Validates the optional rejection reason submitted with LicenseApplicationViewSet's reject action."""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class SelfProfileSerializer(serializers.Serializer):
    """Handles the logged-in user's self-service profile edits, including an optional password change."""

    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    nic = serializers.CharField(max_length=20, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    current_password = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    new_password = serializers.CharField(
        required=False, allow_blank=True, min_length=8, write_only=True
    )
    notify_in_app_messages = serializers.BooleanField(required=False)
    # Farmer-only preference; silently ignored (see save()) for any user
    # without a farmer_profile, so it's safe to accept from every caller.
    notify_harvest_updates = serializers.BooleanField(required=False)
    notify_via_sms = serializers.BooleanField(required=False)

    def validate(self, attrs):
        # Changing the password requires re-confirming the current one,
        # even though the user is already authenticated, as a safeguard
        # against a hijacked session changing the password silently.
        new_password = attrs.get("new_password")
        current_password = attrs.get("current_password")
        if new_password:
            user = self.context["user"]
            if not current_password or not user.check_password(current_password):
                raise serializers.ValidationError(
                    {"detail": "Current password is incorrect."}
                )
        return attrs

    def save(self, **kwargs):
        user = self.context["user"]
        full_name = self.validated_data.get("full_name")
        nic = self.validated_data.get("nic")
        phone_number = self.validated_data.get("phone_number")
        profile_picture = self.validated_data.get("profile_picture")
        new_password = self.validated_data.get("new_password")
        notify_in_app_messages = self.validated_data.get("notify_in_app_messages")
        notify_harvest_updates = self.validated_data.get("notify_harvest_updates")
        notify_via_sms = self.validated_data.get("notify_via_sms")

        if full_name is not None:
            user.full_name = full_name.strip()
        if nic is not None:
            user.nic = nic.strip()
        if phone_number is not None:
            user.phone_number = phone_number.strip()
        if profile_picture is not None:
            user.profile_picture = profile_picture
        if new_password:
            user.set_password(new_password)
            # Setting their own password is exactly what must_change_password
            # exists to force — clear it once they've done so.
            user.must_change_password = False
        if notify_in_app_messages is not None:
            user.notify_in_app_messages = notify_in_app_messages

        user.save()

        if hasattr(user, "farmer_profile"):
            farmer_update_fields = []
            if notify_harvest_updates is not None:
                user.farmer_profile.notify_harvest_updates = notify_harvest_updates
                farmer_update_fields.append("notify_harvest_updates")
            if notify_via_sms is not None:
                user.farmer_profile.notify_via_sms = notify_via_sms
                farmer_update_fields.append("notify_via_sms")
            if farmer_update_fields:
                user.farmer_profile.save(update_fields=farmer_update_fields)

        return user


class RoleMiniSerializer(serializers.ModelSerializer):
    """Compact Role representation (no permissions list) for nesting inside user records."""

    class Meta:
        model = Role
        fields = ["id", "name", "slug"]


def get_effective_phone_number(user):
    """
    A user's contact number, wherever it actually lives: captured on their
    role-specific profile at registration/creation (farmer, mill owner,
    authorized purchaser, PMB officer), falling back to User.phone_number
    for accounts with no such profile or who've only ever set it via
    self-service Settings. Returns None if nothing is on file anywhere —
    used both by AdminUserSerializer.get_phone_number below and by the
    forgot-password OTP flow's SMS channel (see views.py's
    ForgotPasswordView).
    """
    farmer = getattr(user, "farmer_profile", None)
    if farmer and farmer.contact_number:
        return farmer.contact_number
    mill = getattr(user, "mill_profile", None)
    if mill and mill.contact_number:
        return mill.contact_number
    purchaser = getattr(user, "authorized_purchaser_profile", None)
    if purchaser and purchaser.phone:
        return purchaser.phone
    officer = getattr(user, "pmb_officer_profile", None)
    if officer and officer.contact_number:
        return officer.contact_number
    return user.phone_number or None


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Read-only representation of a User for the admin user list/detail
    views — every column on the `accounts_user` table that's meaningful to
    show an admin, plus a couple of computed convenience fields (nic,
    phone, is_locked). `password` is deliberately excluded (never
    serialized out), and `is_staff`/`is_superuser` are Django's own
    admin-site escape hatches, unrelated to this app's Role/Permission
    RBAC — omitted so this screen can't be used to grant them.
    """

    role = RoleMiniSerializer(read_only=True)
    nic = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    employee_no = serializers.SerializerMethodField()
    designation = serializers.SerializerMethodField()
    district = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "nic", "phone_number", "role",
            "is_active", "email_confirmed", "date_joined", "last_login",
            "last_activity", "is_locked", "employee_no", "designation", "district",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "last_activity"]

    def get_nic(self, obj):
        # Farmers'/officers' authoritative NIC is captured on their own
        # profile at creation (User.nic is left blank there); accounts with
        # neither profile only ever get a NIC via their own Settings page,
        # which writes straight to User.nic. Prefer the profile's value
        # when there is one, otherwise fall back to the User's own field.
        farmer = getattr(obj, "farmer_profile", None)
        if farmer and farmer.nic:
            return farmer.nic
        officer = getattr(obj, "pmb_officer_profile", None)
        if officer and officer.nic:
            return officer.nic
        return obj.nic or None

    def get_phone_number(self, obj):
        return get_effective_phone_number(obj)

    def get_is_locked(self, obj):
        return bool(obj.locked_until and obj.locked_until > timezone.now())

    def get_employee_no(self, obj):
        officer = getattr(obj, "pmb_officer_profile", None)
        return officer.employee_no if officer else None

    def get_designation(self, obj):
        officer = getattr(obj, "pmb_officer_profile", None)
        return officer.designation if officer else None

    def get_district(self, obj):
        officer = getattr(obj, "pmb_officer_profile", None)
        return officer.district_id if officer and officer.district_id else None


def generate_temp_password() -> str:
    """A random 12-character password (letters, digits, and a few punctuation marks) for admin-created/-reset accounts — always treated as temporary (see must_change_password)."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(12))


class AdminUserWriteSerializer(serializers.ModelSerializer):
    """
    Handles admin-driven create/update of a User account. `password` is
    always optional now — leaving it blank on create auto-generates one
    server-side rather than forcing the admin to invent it, and either way
    (typed or generated) it's emailed to the user as a temporary password
    they must change on first login (see AdminUserViewSet.perform_create/
    perform_update and must_change_password).
    """

    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )
    # Officer-only fields below — meaningful only when the assigned role is
    # "pmb_officer" (see create()/update()); ignored for every other role.
    # employee_no isn't here since it's server-generated, same as a
    # Farmer's/Mill's registration_no, never admin-typed.
    designation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    district = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "nic", "phone_number", "role",
            "is_active", "email_confirmed", "password", "designation", "district",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password", "") or generate_temp_password()
        designation = validated_data.pop("designation", "")
        district_id = validated_data.pop("district", None)
        user = User(**validated_data)
        user.set_password(password)  # hash before saving
        user.must_change_password = True
        user.save()
        # Not persisted — stashed only so the view can email it once, right
        # after this call returns; never touches the database in plaintext.
        user._plain_password = password

        if user.role.slug == "pmb_officer":
            PmbOfficer.objects.create(
                user=user,
                employee_no=f"EMP-{timezone.now().year}-{random.randint(100000, 999999)}",
                nic=validated_data.get("nic", ""),
                designation=designation,
                district_id=district_id,
                contact_number=validated_data.get("phone_number", ""),
            )

        return user

    def update(self, instance, validated_data):
        # Editing a user can no longer set their password directly — even
        # if a stale client sends one, it's silently ignored. Resetting a
        # password is only ever a dedicated action now (always a fresh
        # system-generated temp password, emailed to the user — see
        # AdminUserViewSet.reset_password in views.py), never an
        # admin-chosen one typed into this form.
        validated_data.pop("password", None)
        designation = validated_data.pop("designation", None)
        district_id = validated_data.pop("district", None)
        # nic/phone_number are read back from the Farmer/PmbOfficer profile
        # when one exists (see AdminUserSerializer.get_nic/get_phone_number)
        # — write through to it here too, or an admin editing those fields
        # from this form would silently appear to do nothing on the list.
        farmer = getattr(instance, "farmer_profile", None)
        if farmer:
            if "nic" in validated_data:
                farmer.nic = validated_data["nic"] or farmer.nic
            if "phone_number" in validated_data:
                farmer.contact_number = validated_data["phone_number"]
            farmer.save(update_fields=["nic", "contact_number"])

        # "role" is in validated_data whenever it's part of this PATCH —
        # get_or_create here so an account whose role is only just now being
        # changed to pmb_officer gets a profile too, not just one that
        # already had the role from creation.
        new_role = validated_data.get("role", instance.role)
        if new_role.slug == "pmb_officer":
            officer, _ = PmbOfficer.objects.get_or_create(
                user=instance,
                defaults={
                    "employee_no": f"EMP-{timezone.now().year}-{random.randint(100000, 999999)}",
                },
            )
            if "nic" in validated_data:
                officer.nic = validated_data["nic"] or officer.nic
            if "phone_number" in validated_data:
                officer.contact_number = validated_data["phone_number"]
            if designation is not None:
                officer.designation = designation
            if district_id is not None:
                officer.district_id = district_id
            officer.save(update_fields=["nic", "contact_number", "designation", "district"])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class PermissionSerializer(serializers.ModelSerializer):
    """Plain read-only representation of a Permission."""

    class Meta:
        model = Permission
        fields = ["codename", "label", "description"]


class RoleSerializer(serializers.ModelSerializer):
    """Read-only Role representation with its permission codenames and how many users currently hold it."""

    permissions = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_system",
            "permissions",
            "user_count",
            "dashboard_widgets",
        ]

    def get_permissions(self, obj):
        return list(obj.permissions.values_list("codename", flat=True))

    def get_user_count(self, obj):
        return obj.users.count()


class RoleWriteSerializer(serializers.ModelSerializer):
    """Handles admin-driven create/update of a Role, accepting a plain list of permission codenames to assign."""

    permissions = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )
    dashboard_widgets = serializers.ListField(
        child=serializers.CharField(), required=False
    )

    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions", "dashboard_widgets"]
        read_only_fields = ["id"]

    def validate_name(self, value):
        # Case-insensitive uniqueness check, excluding this instance
        # itself so a no-op rename during update doesn't false-positive.
        qs = Role.objects.filter(name__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A role with this name already exists.")
        return value.strip()

    def validate_permissions(self, codenames):
        # Translate the incoming codename strings into actual Permission
        # instances, rejecting the request if any codename doesn't exist.
        permissions = list(Permission.objects.filter(codename__in=codenames))
        found = {p.codename for p in permissions}
        missing = set(codenames) - found
        if missing:
            raise serializers.ValidationError(
                f"Unknown permission(s): {', '.join(sorted(missing))}"
            )
        return permissions

    def validate_dashboard_widgets(self, keys):
        # Same "reject unknown values" defensiveness as validate_permissions
        # above — keeps the stored list limited to widget keys
        # OfficerDashboardPanel.tsx actually knows how to render.
        unknown = set(keys) - set(OFFICER_DASHBOARD_WIDGETS)
        if unknown:
            raise serializers.ValidationError(
                f"Unknown dashboard widget(s): {', '.join(sorted(unknown))}"
            )
        return keys

    def create(self, validated_data):
        permissions = validated_data.pop("permissions", [])
        role = Role.objects.create(**validated_data)
        # through_defaults attributes each grant to the admin making it —
        # RolePermission.granted_by/granted_date (see accounts/models.py).
        role.permissions.set(
            permissions, through_defaults={"granted_by": self.context["request"].user}
        )
        return role

    def update(self, instance, validated_data):
        permissions = validated_data.pop("permissions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # None means "permissions weren't part of this update" (leave
        # unchanged); an empty list explicitly clears all permissions.
        if permissions is not None:
            instance.permissions.set(
                permissions, through_defaults={"granted_by": self.context["request"].user}
            )
        return instance


class MessageSerializer(serializers.ModelSerializer):
    """Read representation of a Message, shown in the notification bell's inbox list."""

    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role.name", read_only=True)
    recipient_name = serializers.SerializerMethodField()
    target_role_label = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "recipient",
            "recipient_name",
            "target_role",
            "target_role_label",
            "body",
            "created_at",
            "is_read",
        ]

    def get_recipient_name(self, obj):
        return obj.recipient.full_name if obj.recipient else None

    def get_target_role_label(self, obj):
        return obj.get_target_role_display() if obj.target_role else None


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Write-only serializer for composing a message. `sender` is set by the
    view from the authenticated request, never accepted from the client.
    """

    class Meta:
        model = Message
        fields = ["recipient", "target_role", "body"]

    def validate(self, attrs):
        request = self.context["request"]
        is_restricted = request.user.role.slug in ("farmer", "driver", "warehouse_manager")

        if attrs.get("recipient") is not None:
            if is_restricted:
                # Farmers, drivers, and warehouse managers can only send a
                # request to a role (recipient=None + target_role) — not
                # message a specific user directly like staff can.
                raise serializers.ValidationError(
                    "You can only send a request to Admin or PMB Officer, not message a specific user."
                )
            # A direct staff-to-user message isn't addressed to a role.
            attrs["target_role"] = None
        elif not attrs.get("target_role"):
            raise serializers.ValidationError(
                {"target_role": "Choose who this request should go to."}
            )

        return attrs

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        return value


class MessageRecipientSerializer(serializers.ModelSerializer):
    """
    Minimal user representation for the "message a user" recipient picker
    — open to any staff (non-farmer) account, not just manage_users
    holders, since PMB Officers need to message farmers too.
    """

    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role_name"]
