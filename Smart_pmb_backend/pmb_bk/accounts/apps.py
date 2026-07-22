# Django app configuration for the "accounts" app.
# Registers the app with Django and is referenced from INSTALLED_APPS in settings.py.
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """App config for accounts: custom User model, JWT auth, and the RBAC (roles/permissions) system."""
    name = 'accounts'
