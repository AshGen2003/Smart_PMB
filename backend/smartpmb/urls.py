from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken import views as auth_views
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny


class ApiRootView(APIView):
    """Human friendly landing page for the API."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "project": "Smart PMB — Logistics Module API",
                "version": "1.0.0",
                "endpoints": {
                    "auth_token": "/api/auth/token/",
                    "dashboard": "/api/dashboard/",
                    "vehicles": "/api/vehicles/",
                    "drivers": "/api/drivers/",
                    "routes": "/api/routes/",
                    "deliveries": "/api/deliveries/",
                    "fuel_records": "/api/fuel-records/",
                    "maintenance_records": "/api/maintenance-records/",
                    "gps_tracking": "/api/gps-tracking/",
                },
            }
        )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", ApiRootView.as_view(), name="api-root"),
    path("api/auth/token/", auth_views.obtain_auth_token, name="api_token_auth"),
    path("api/", include("logistics.urls")),
]
