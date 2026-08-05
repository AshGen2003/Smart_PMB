"""
ASGI config for pmb_bk project.

Production still serves 100% of the REST API through wsgi.py/gunicorn
(see deploy/gunicorn.service) -- this file is Daphne's entry point (see
deploy/daphne.service), a separate, loopback-only process that exists
solely for real-time notification delivery: the browser-facing
/ws/notifications/ WebSocket, and the internal /internal/ws-push/ endpoint
accounts/signals.py calls into when a Message is created. See
notifications/consumers.py for both.

`manage.py runserver` never touches this file at all -- Channels 4.x
removed the automatic runserver override earlier versions had (verified:
the installed channels package ships no
management/commands/runserver.py). So `runserver` always serves plain
WSGI/REST, exactly as before this feature existed, and this file's "http"
catch-all branch is only ever exercised by Daphne itself: to test the WS
path locally, run `daphne -b 127.0.0.1 -p 8000 pmb_bk.asgi:application`
as a second process alongside (or instead of) `runserver` -- same
two-process shape as production, just both on localhost.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pmb_bk.settings')

# Must run (and complete django.setup()) before importing anything that
# touches Django models/serializers -- Channels' documented ordering
# requirement for this file.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.urls import path, re_path  # noqa: E402

from notifications.auth_middleware import CookieJWTAuthMiddleware  # noqa: E402
from notifications.consumers import InternalPushConsumer  # noqa: E402
from notifications.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": URLRouter([
        path("internal/ws-push/", InternalPushConsumer.as_asgi()),
        re_path(r"^", django_asgi_app),
    ]),
    "websocket": CookieJWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
