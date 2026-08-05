"""
WebSocket delivery for the notification bell (see
my-app/app/components/NotificationBell.tsx's useNotificationSocket hook)
plus the internal loopback endpoint accounts/signals.py pushes into
whenever a Message is created. Runs in a separate ASGI process (Daphne,
see deploy/daphne.service) from the REST API's WSGI/gunicorn process --
this consumer's channel_layer only ever needs to reach sockets held by
THIS process, so the in-memory channel layer (CHANNEL_LAYERS in
settings.py) is sufficient without Redis.
"""
import json
import secrets

from channels.generic.http import AsyncHttpConsumer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.layers import get_channel_layer
from django.conf import settings


def user_group(user_id):
    return f"notify_user_{user_id}"


def role_group(role_slug):
    return f"notify_role_{role_slug}"


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    One group membership per connected user (their own inbox) plus one per
    their role (the shared admin/pmb_officer role inbox) -- mirrors
    _visible_messages()'s exact targeting rule in accounts/views.py, so a
    pushed Message always reaches precisely the sockets that would also
    see it via a manual GET /api/messages/inbox/ poll.
    """

    async def connect(self):
        user_id = self.scope.get("ws_user_id")
        if not user_id:
            await self.close(code=4401)
            return

        self.user_group = user_group(user_id)
        self.role_group = role_group(self.scope.get("ws_role_slug"))
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.channel_layer.group_add(self.role_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
            await self.channel_layer.group_discard(self.role_group, self.channel_name)

    async def notify_message(self, event):
        """Handler for the {"type": "notify.message", ...} group_send from InternalPushConsumer below."""
        await self.send_json(event["message"])


class InternalPushConsumer(AsyncHttpConsumer):
    """
    POST /internal/ws-push/ -- loopback-only (no Nginx location routes to
    it; only accounts/signals.py's post_save receiver calls this, over
    127.0.0.1). Mirrors the secret-gated "unauthenticated caller,
    secret-verified" shape already used by sysops/views.py's
    RunCapacityForecastsView for the same reason: this endpoint has no
    request.user to authenticate against (it's a server-to-server call
    from the WSGI process, not a browser).
    """

    async def handle(self, body):
        provided = dict(self.scope["headers"]).get(b"x-ws-internal-secret", b"").decode()
        if not settings.WS_INTERNAL_SECRET or not secrets.compare_digest(provided, settings.WS_INTERNAL_SECRET):
            await self.send_response(403, b"forbidden", headers=[(b"Content-Type", b"text/plain")])
            return

        try:
            payload = json.loads(body)
            groups = payload["groups"]
            message = payload["message"]
        except (ValueError, KeyError):
            await self.send_response(400, b"bad request", headers=[(b"Content-Type", b"text/plain")])
            return

        channel_layer = get_channel_layer()
        for group in groups:
            await channel_layer.group_send(group, {"type": "notify.message", "message": message})

        await self.send_response(200, b"ok", headers=[(b"Content-Type", b"text/plain")])
