import random

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from farmers.models import District, Farmer

from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.email_confirmed:
            raise serializers.ValidationError(
                {"detail": "Please confirm your email address before logging in."}
            )
        return data


class RegisterFarmerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    name = serializers.CharField(max_length=100)
    nic = serializers.CharField(max_length=20)
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    district_id = serializers.IntegerField()
    land_size = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bank_account = serializers.CharField(max_length=50, required=False, allow_blank=True)

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
        registration_no = f"FRM-{timezone.now().year}-{random.randint(100000, 999999)}"

        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                full_name=validated_data["name"],
                role=User.Role.FARMER,
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
                bank_name=validated_data.get("bank_name", ""),
                bank_account=validated_data.get("bank_account", ""),
            )

        return {"user": user, "farmer": farmer}


class SelfProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    current_password = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    new_password = serializers.CharField(
        required=False, allow_blank=True, min_length=8, write_only=True
    )

    def validate(self, attrs):
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
        new_password = self.validated_data.get("new_password")

        if full_name is not None:
            user.full_name = full_name.strip()
        if new_password:
            user.set_password(new_password)

        user.save()
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "date_joined"]
        read_only_fields = ["id", "date_joined"]


class AdminUserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "password"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Password is required for new users."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
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
