from django.core import signing

EMAIL_CONFIRMATION_SALT = "accounts.email-confirmation"
EMAIL_CONFIRMATION_MAX_AGE = 60 * 60 * 48  # 48 hours


def make_email_confirmation_token(user_id) -> str:
    return signing.dumps({"uid": str(user_id)}, salt=EMAIL_CONFIRMATION_SALT)


def read_email_confirmation_token(token: str) -> str:
    data = signing.loads(
        token,
        salt=EMAIL_CONFIRMATION_SALT,
        max_age=EMAIL_CONFIRMATION_MAX_AGE,
    )
    return data["uid"]
