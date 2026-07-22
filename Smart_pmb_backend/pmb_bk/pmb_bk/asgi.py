"""
ASGI config for pmb_bk project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pmb_bk.settings')

# Entry point used by ASGI servers (e.g. daphne/uvicorn) for async-capable
# deployment; this project otherwise runs fine under the WSGI entry point
# in wsgi.py for a standard synchronous DRF API.
application = get_asgi_application()
