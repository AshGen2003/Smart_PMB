# SMS delivery for the forgot-password OTP flow, via the Text.lk gateway
# (https://text.lk). Configure TEXTLK_API_TOKEN/TEXTLK_SENDER_ID in .env to
# send real texts; left blank, this just logs the code instead (handy for
# local dev with no SMS gateway account).
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 10


def _to_international(phone_number: str) -> str:
    """Normalize a Sri Lankan number (as stored on Farmer/Mill/etc. profiles,
    e.g. "0771234567") to the country-code-prefixed format Text.lk expects
    ("94771234567"), leaving already-international numbers untouched."""
    digits = "".join(ch for ch in phone_number if ch.isdigit())
    if digits.startswith("94"):
        return digits
    if digits.startswith("0"):
        return "94" + digits[1:]
    return digits


def send_otp_sms(phone_number: str, code: str) -> None:
    if not settings.TEXTLK_API_TOKEN:
        logger.info("[SMS STUB] Would send OTP %s to %s", code, phone_number)
        return

    try:
        response = requests.post(
            settings.TEXTLK_API_URL,
            headers={
                "Authorization": f"Bearer {settings.TEXTLK_API_TOKEN}",
                "Accept": "application/json",
            },
            json={
                "recipient": _to_international(phone_number),
                "sender_id": settings.TEXTLK_SENDER_ID,
                "type": "plain",
                "message": f"Your Smart PMB password reset code is {code}. It expires in 10 minutes.",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        # Text.lk returns HTTP 200 even for API-level errors (bad sender ID,
        # insufficient balance, etc.) — the real result is in the body.
        body = response.json()
        if body.get("status") != "success":
            logger.error(
                "Text.lk rejected OTP SMS to %s: %s", phone_number, body.get("message", body)
            )
    except requests.RequestException:
        # Never let an SMS gateway failure surface to the requester — same
        # anti-enumeration reasoning as the rest of ForgotPasswordView, and
        # a transient gateway outage shouldn't 500 the whole request. Log it
        # so it's visible in ops without leaking to the client.
        logger.exception("Failed to send OTP SMS via Text.lk to %s", phone_number)
