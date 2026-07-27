# URL routes for authentication and self-service account endpoints.
# Note: the admin-facing user/role/permission management endpoints
# (AdminUserViewSet, RoleViewSet, PermissionListView, AdminOverviewView)
# are wired up via a router in the project-level pmb_bk/urls.py, not here.
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/farmer/", views.RegisterFarmerView.as_view()),  # farmer self-registration
    path("register/mill-owner/", views.RegisterMillOwnerView.as_view()),  # mill owner self-registration
    path("confirm-email/", views.ConfirmEmailView.as_view()),  # consumes the emailed confirmation token
    path("login/", views.LoginView.as_view()),  # obtains JWT access+refresh token pair
    path("refresh/", TokenRefreshView.as_view()),  # simplejwt's built-in refresh endpoint
    path("logout/", views.LogoutView.as_view()),  # blacklists the refresh token
    path("me/", views.MeView.as_view()),  # get/update the logged-in user's own profile
]
