from django.urls import path

from . import views

urlpatterns = [
    path("auth/login/", views.login_view, name="auth-login"),
    path("auth/refresh/", views.refresh_view, name="auth-refresh"),
    path("auth/logout/", views.logout_view, name="auth-logout"),
    path("auth/me/", views.me_view, name="auth-me"),
]
