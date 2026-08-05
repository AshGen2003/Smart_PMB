# URL routes for authentication and self-service account endpoints.
# Note: the admin-facing user/role/permission management endpoints
# (AdminUserViewSet, RoleViewSet, PermissionListView, AdminOverviewView)
# are wired up via a router in the project-level pmb_bk/urls.py, not here.
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/farmer/", views.RegisterFarmerView.as_view()),  # farmer self-registration
    path("register/license/", views.RegisterLicenseApplicantView.as_view()),  # authorized purchaser / mill owner self-registration
    path("confirm-email/", views.ConfirmEmailView.as_view()),  # consumes the emailed confirmation token
    path("forgot-password/", views.ForgotPasswordView.as_view()),  # requests a self-service password-reset OTP (email or SMS)
    path("reset-password/", views.VerifyResetOTPView.as_view()),  # verifies the OTP code, sets a new password
    path("login/", views.LoginView.as_view()),  # obtains JWT access+refresh token pair
    path("refresh/", TokenRefreshView.as_view()),  # simplejwt's built-in refresh endpoint
    path("logout/", views.LogoutView.as_view()),  # blacklists the refresh token
    path("me/", views.MeView.as_view()),  # get/update the logged-in user's own profile
    path("license-application/document/", views.LicenseApplicationDocumentView.as_view()),  # applicant uploads their own supporting document while pending
]
