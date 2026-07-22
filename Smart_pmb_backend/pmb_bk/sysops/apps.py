# Django app configuration for the "sysops" app.
# Registers the app with Django and is referenced from INSTALLED_APPS in settings.py.
from django.apps import AppConfig


class SysopsConfig(AppConfig):
    """App config for sysops: system administration - audit/auth logs, alerts, backups, config, and PDF reports."""
    name = 'sysops'
