"""
WSGI config for pmb_bk project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pmb_bk.settings')

# Entry point used by WSGI servers (e.g. gunicorn) to run this Django/DRF
# API in production; referenced by WSGI_APPLICATION in settings.py.
application = get_wsgi_application()
