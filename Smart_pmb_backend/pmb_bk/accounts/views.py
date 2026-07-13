from django.core import signing
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

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
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
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
        return super().destroy(request, *args, **kwargs)


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [RoleAccessPermission]
    queryset = Role.objects.all().prefetch_related("permissions").order_by("name")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return RoleWriteSerializer
        return RoleSerializer

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
        return super().destroy(request, *args, **kwargs)


class PermissionListView(APIView):
    permission_classes = [RoleAccessPermission]

    def get(self, request):
        permissions = Permission.objects.all().order_by("codename")
        return Response(PermissionSerializer(permissions, many=True).data)
