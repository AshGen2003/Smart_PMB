# Django app configuration for the "mills" app.
# Registers the app with Django and is referenced from INSTALLED_APPS in settings.py.
from django.apps import AppConfig


class MillsConfig(AppConfig):
    """App config for mills: rice mill owner profiles, license applications, and milling reports."""
    name = 'mills'
