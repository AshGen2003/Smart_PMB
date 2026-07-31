# Outbound email helpers for the accounts app. Currently just the
# account-confirmation email sent after farmer self-registration.
from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_email_confirmation_token


def send_confirmation_email(user):
    """
    Email the user a signed confirmation link pointing at the frontend's
    confirm-email page. When EMAIL_BACKEND is Django's console backend
    (the default here whenever EMAIL_HOST isn't configured in .env),
    there's no real inbox to receive that link — the message still prints
    to the server console for visibility, but the account is auto-confirmed
    immediately afterwards so local/dev signups never get stuck waiting on
    an email nobody can actually click. A real EMAIL_BACKEND/EMAIL_HOST
    (production) keeps the normal confirm-before-login flow.
    """
    token = make_email_confirmation_token(user.id)
    confirm_url = f"{settings.FRONTEND_URL}/confirm-email?token={token}"

    send_mail(
        subject="Confirm your Smart PMB account",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            "Thanks for signing up for Smart PMB. Please confirm your email "
            f"address by visiting the link below:\n\n{confirm_url}\n\n"
            "This link expires in 48 hours. If you didn't create this account, "
            "you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

    if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
        user.email_confirmed = True
        user.save(update_fields=["email_confirmed"])
