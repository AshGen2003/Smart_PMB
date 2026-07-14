from django.core import signing
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from sysops.utils import log_audit, log_auth

from .emails import send_confirmation_email
from .models import Permission, Role, User
from .permissions import HasPermission, RoleAccessPermission
from .serializers import (
    AdminUserSerializer,
    AdminUserWriteSerializer,
    CustomTokenObtainPairSerializer,
    PermissionSerializer,
    RegisterFarmerSerializer,
    RoleSerializer,
    RoleWriteSerializer,
    SelfProfileSerializer,
)
from .tokens import read_email_confirmation_token


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterFarmerView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
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


class ConfirmEmailView(APIView):
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


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                pass
        log_auth(request, "logout", user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def _profile_picture_url(self, request, user):
        if not user.profile_picture:
            return None
        return request.build_absolute_uri(user.profile_picture.url)

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
            }
        )

    def patch(self, request):
        serializer = SelfProfileSerializer(
            data=request.data, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

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
                "access": str(token.access_token),
                "refresh": str(token),
            }
        )


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission("manage_users")]
    queryset = User.objects.all().select_related("role").order_by("-date_joined")

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role__slug=role)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdminUserWriteSerializer
        return AdminUserSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
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

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit(self.request.user, "update_user", "accounts", user.email)

    @action(detail=True, methods=["post"], permission_classes=[HasPermission("manage_system")])
    def unlock(self, request, pk=None):
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
        user = self.get_object()
        for outstanding in OutstandingToken.objects.filter(user=user):
            try:
                RefreshToken(outstanding.token).blacklist()
            except Exception:
                pass
        log_audit(request.user, "force_logout", "accounts", user.email)
        return Response({"detail": "Session revoked."})


class RoleViewSet(viewsets.ModelViewSet):
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
        if instance.is_system:
            return Response(
                {"detail": "System roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if instance.users.exists():
            return Response(
                {"detail": "This role is still assigned to one or more users."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = instance.name
        response = super().destroy(request, *args, **kwargs)
        log_audit(request.user, "delete_role", "accounts", name)
        return response


class PermissionListView(APIView):
    permission_classes = [RoleAccessPermission]

    def get(self, request):
        permissions = Permission.objects.all().order_by("codename")
        return Response(PermissionSerializer(permissions, many=True).data)


class AdminOverviewView(APIView):
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
