# Signed, stateless tokens used to confirm a user's email address without
# needing a separate database table to track pending confirmations. Uses
# Django's `signing` module (HMAC-signed, tamper-proof, time-limited).
from django.core import signing

EMAIL_CONFIRMATION_SALT = "accounts.email-confirmation"
EMAIL_CONFIRMATION_MAX_AGE = 60 * 60 * 48  # 48 hours


def make_email_confirmation_token(user_id) -> str:
    """Create a signed token embedding the user's id, to put in the confirmation link."""
    return signing.dumps({"uid": str(user_id)}, salt=EMAIL_CONFIRMATION_SALT)


def read_email_confirmation_token(token: str) -> str:
    """Verify and decode a confirmation token, returning the embedded user id.

    Raises signing.SignatureExpired if older than EMAIL_CONFIRMATION_MAX_AGE,
    or signing.BadSignature if it was tampered with / malformed.
    """
    data = signing.loads(
        token,
        salt=EMAIL_CONFIRMATION_SALT,
        max_age=EMAIL_CONFIRMATION_MAX_AGE,
    )
    return data["uid"]
