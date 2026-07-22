# Django app configuration for the "farmers" app.
# Registers the app with Django and is referenced from INSTALLED_APPS in settings.py.
from django.apps import AppConfig


class FarmersConfig(AppConfig):
    """App config for farmers: farmer profiles, harvest submissions, warehouses, paddy types, and payments."""
    name = 'farmers'
