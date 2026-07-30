import logging

from django.contrib.auth import authenticate
from django.middleware.csrf import _get_new_csrf_string
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer

logger = logging.getLogger("smart_pmb")


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def login_view(request):
    email = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    user = authenticate(request, email=email, password=password)
    if user is None:
        return Response(
            {"error": {"message": "Invalid email or password", "code": "AUTH_FAILED"}},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    response = Response(
        {
            "access": access_token,
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7 * 24 * 3600,
        path="/api/auth/",
    )

    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_view(request):
    refresh_token = request.COOKIES.get("refresh_token") or request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"error": {"message": "Refresh token required", "code": "NO_REFRESH"}},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)
        new_refresh = str(refresh)

        response = Response({"access": access_token}, status=status.HTTP_200_OK)
        response.set_cookie(
            key="refresh_token",
            value=new_refresh,
            httponly=True,
            secure=True,
            samesite="Strict",
            max_age=7 * 24 * 3600,
            path="/api/auth/",
        )
        return response
    except Exception as e:
        logger.warning(f"Refresh token failed: {e}")
        return Response(
            {"error": {"message": "Invalid or expired refresh token", "code": "BAD_REFRESH"}},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@api_view(["POST"])
def logout_view(request):
    response = Response({"ok": True}, status=status.HTTP_200_OK)
    response.delete_cookie("refresh_token", path="/api/auth/")
    return response


@api_view(["GET"])
def me_view(request):
    return Response({"user": UserSerializer(request.user).data})
