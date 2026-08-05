"""
Pushes a newly-created Message over WebSocket to whoever should see it
instantly, instead of making them wait for the notification bell's next
poll. Hooked as a single post_save receiver (rather than touching each of
Message's ~9 creation call sites individually) so it can never be
forgotten at a new call site.
"""
import json
import logging

import requests
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Message
from .serializers import MessageSerializer

logger = logging.getLogger(__name__)


def _target_groups(message):
    """
    Mirrors _visible_messages()'s targeting rule (accounts/views.py) —
    keep the two in sync: this is the producer-side half of the same
    "who can see this message" logic.
    """
    if message.recipient_id:
        return [f"notify_user_{message.recipient_id}"]
    if message.target_role:
        return [f"notify_role_{message.target_role}"]
    return []


def _send_push(message):
    if not settings.WS_PUSH_URL or not settings.WS_INTERNAL_SECRET:
        return  # WS infra not configured — the frontend's fallback poll still delivers it
    groups = _target_groups(message)
    if not groups:
        return
    try:
        # Not requests' json= kwarg -- that uses stdlib json, which can't
        # serialize the UUID sender/recipient fields MessageSerializer
        # produces (this app's User model has UUID primary keys).
        # DjangoJSONEncoder is the standard fix, same encoder DRF's own
        # JSONRenderer uses under the hood.
        body = json.dumps({"groups": groups, "message": MessageSerializer(message).data}, cls=DjangoJSONEncoder)
        requests.post(
            settings.WS_PUSH_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-WS-Internal-Secret": settings.WS_INTERNAL_SECRET,
            },
            timeout=1.0,
        )
    except requests.RequestException:
        # Best-effort only — the message is already saved, and the bell's
        # fallback poll will pick it up regardless of this push's outcome.
        logger.warning("WebSocket push failed for message %s", message.pk, exc_info=True)


@receiver(post_save, sender=Message)
def push_message_over_websocket(sender, instance, created, **kwargs):
    # MessageMarkReadView's save(update_fields=["is_read"]) also fires
    # post_save with created=False — only push genuinely new messages.
    # (MessageMarkAllReadView's bulk .update() fires no signal at all.)
    if not created:
        return
    transaction.on_commit(lambda: _send_push(instance))
