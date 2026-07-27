# Serializers for the accounts app: JWT login (with failed-login lockout
# logic), farmer self-registration, self-service profile editing, and the
# admin-facing user/role/permission management endpoints.
import random
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from farmers.models import District, Farmer
from mills.models import Mill
from sysops.utils import get_config_value, log_auth

from .models import Message, Permission, Role, User


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


class RegisterMillOwnerSerializer(serializers.Serializer):
    """Validates and creates a new mill owner's User account plus matching Mill profile in one transaction."""

    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    mill_name = serializers.CharField(max_length=150)
    owner_name = serializers.CharField(max_length=100)
    nic = serializers.CharField(max_length=20)
    business_reg_no = serializers.CharField(max_length=50, required=False, allow_blank=True)
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    district_id = serializers.IntegerField()
    capacity_mt_per_day = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_nic(self, value):
        if Mill.objects.filter(nic=value).exists():
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
        # Human-friendly registration number, e.g. "MIL-2026-483920", same
        # scheme as a farmer's registration_no (see RegisterFarmerSerializer).
        registration_no = f"MIL-{timezone.now().year}-{random.randint(100000, 999999)}"

        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                full_name=validated_data["owner_name"],
                role=Role.objects.get(slug="mill_owner"),
                email_confirmed=False,
            )
            mill = Mill.objects.create(
                user=user,
                registration_no=registration_no,
                mill_name=validated_data["mill_name"],
                owner_name=validated_data["owner_name"],
                nic=validated_data["nic"],
                business_reg_no=validated_data.get("business_reg_no", ""),
                district=district,
                province=district.province,
                capacity_mt_per_day=validated_data.get("capacity_mt_per_day"),
                contact_number=validated_data.get("contact_number", ""),
            )

        return {"user": user, "mill": mill}


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

        user.save()
        return user


class RoleMiniSerializer(serializers.ModelSerializer):
    """Compact Role representation (no permissions list) for nesting inside user records."""

    class Meta:
        model = Role
        fields = ["id", "name", "slug"]


class AdminUserSerializer(serializers.ModelSerializer):
    """Read-only representation of a User for the admin user list/detail views, with computed NIC and lock-status fields."""

    role = RoleMiniSerializer(read_only=True)
    nic = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "nic", "role", "is_active",
            "date_joined", "is_locked",
        ]
        read_only_fields = ["id", "date_joined"]

    def get_nic(self, obj):
        # NIC lives on the Farmer profile, not the User itself, so pull it
        # through the reverse relation when one exists (staff/officer
        # accounts have no farmer_profile).
        farmer = getattr(obj, "farmer_profile", None)
        return farmer.nic if farmer else None

    def get_is_locked(self, obj):
        return bool(obj.locked_until and obj.locked_until > timezone.now())


class AdminUserWriteSerializer(serializers.ModelSerializer):
    """Handles admin-driven create/update of a User account, including an optional password reset."""

    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "password"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        # Password is mandatory when creating a new user, but optional on
        # update (omitting it just leaves the existing password in place).
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Password is required for new users."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)  # hash before saving
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
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

    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions"]
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

    def create(self, validated_data):
        permissions = validated_data.pop("permissions", [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(permissions)
        return role

    def update(self, instance, validated_data):
        permissions = validated_data.pop("permissions", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # None means "permissions weren't part of this update" (leave
        # unchanged); an empty list explicitly clears all permissions.
        if permissions is not None:
            instance.permissions.set(permissions)
        return instance


class MessageSerializer(serializers.ModelSerializer):
    """Read representation of a Message, shown in the notification bell's inbox list."""

    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role.name", read_only=True)
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "recipient",
            "recipient_name",
            "body",
            "created_at",
            "is_read",
        ]

    def get_recipient_name(self, obj):
        return obj.recipient.full_name if obj.recipient else None


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Write-only serializer for composing a message. `sender` is set by the
    view from the authenticated request, never accepted from the client.
    """

    class Meta:
        model = Message
        fields = ["recipient", "body"]

    def validate(self, attrs):
        request = self.context["request"]
        if attrs.get("recipient") is not None and request.user.role.slug == "farmer":
            # Farmers can only send a request to the admin/officer team
            # (recipient=None) — not message a specific user directly.
            raise serializers.ValidationError(
                "Farmers can only send a request to the admin team, not message a specific user."
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
