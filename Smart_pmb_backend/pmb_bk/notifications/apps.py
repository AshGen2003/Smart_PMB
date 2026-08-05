# Django app configuration for the "notifications" app: the real-time
# WebSocket notification-push layer (see consumers.py, auth_middleware.py).
# No models -- this app exists purely to hold the ASGI-side code that lives
# outside gunicorn's WSGI process (see pmb_bk/asgi.py).
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = 'notifications'
