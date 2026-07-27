# Django app configuration for the "purchases" app.
# Registers the app with Django and is referenced from INSTALLED_APPS in settings.py.
from django.apps import AppConfig


class PurchasesConfig(AppConfig):
    """App config for purchases: an Authorized Purchaser's rice requests and personal stock ledger."""
    name = 'purchases'
