from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/farmer/", views.RegisterFarmerView.as_view()),
    path("confirm-email/", views.ConfirmEmailView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("refresh/", TokenRefreshView.as_view()),
    path("logout/", views.LogoutView.as_view()),
    path("me/", views.MeView.as_view()),
]
