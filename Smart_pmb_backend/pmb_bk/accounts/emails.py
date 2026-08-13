# Outbound email helpers for the accounts app: account confirmation after
# self-registration, an admin-created account's temporary password, a
# self-service password-reset OTP code, and a licensing application's
# approve/reject decision.
import threading

from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_email_confirmation_token


def send_async(func, *args, **kwargs):
    """
    Runs an email-sending function on a background thread instead of the
    request thread. A real SMTP send (TLS handshake + auth + send) takes
    several seconds — fine for signup/password-reset flows where the user
    already expects to wait for an email, but impersonation's OTP request
    is meant to feel like an instant "code sent" confirmation, not a multi
    -second hang. No task queue exists in this codebase, so this is the
    lightweight equivalent for call sites where the caller doesn't need to
    block on (or handle failure of) the send.
    """
    threading.Thread(target=func, args=args, kwargs=kwargs, daemon=True).start()


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


def send_otp_email(user, code):
    """Emails the user a one-time code to enter on the forgot-password page, letting them set a new password themselves."""
    send_mail(
        subject="Your Smart PMB password reset code",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            "We received a request to reset your Smart PMB password. Enter "
            f"the code below on the reset page to continue:\n\n{code}\n\n"
            "This code expires in 10 minutes. If you didn't request this, "
            "you can safely ignore this email — your password won't change."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_temp_password_email(user, temp_password):
    """
    Emails a newly admin-created (or admin-reset) account its login email and
    system-generated temporary password. The account is flagged
    must_change_password=True at the same time it's created (see
    AdminUserWriteSerializer), so the recipient is forced to set their own
    password the moment they first log in.
    """
    send_mail(
        subject="Your Smart PMB account has been created",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            "An administrator has created a Smart PMB account for you.\n\n"
            f"Email: {user.email}\n"
            f"Temporary password: {temp_password}\n\n"
            f"Log in at {settings.FRONTEND_URL}/login — you'll be asked to "
            "set your own password before you can do anything else. This "
            "temporary password is only valid until then."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_impersonation_otp_email(user, admin_email, code):
    """
    Emails the account holder a one-time code to relay back to the
    requesting admin before AdminUserViewSet.impersonate will let that
    admin sign in as them — this is the consent step itself. Unlike
    send_impersonation_notice_email below (sent only after access already
    happened), nothing happens here unless the recipient chooses to hand
    the code over.
    """
    send_mail(
        subject="Someone wants to sign in as your Smart PMB account",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            f"An administrator ({admin_email}) has requested to sign in as "
            "your Smart PMB account for support or troubleshooting "
            f"purposes. If you agree, share this code with them:\n\n{code}\n\n"
            "This code expires in 10 minutes. If you didn't expect this or "
            "don't want to grant access, just ignore this email — without "
            "the code, the request can't go through."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_impersonation_notice_email(user, admin_email):
    """
    Emails an account holder that an admin signed in as their real account
    (see accounts/views.py's AdminUserViewSet.impersonate) — a transparency
    notice, not something they can act on or opt out of, since impersonation
    itself is already permission-gated and audit-logged on the admin side.
    """
    send_mail(
        subject="An administrator accessed your Smart PMB account",
        message=(
            f"Hi {user.full_name or user.email},\n\n"
            f"An administrator ({admin_email}) signed in as your Smart PMB "
            "account for support or troubleshooting purposes just now.\n\n"
            "This is a routine notice — you don't need to do anything. If "
            "this seems unexpected, contact the PMB office."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_license_decision_email(application):
    """Emails the applicant once an officer/admin approves or rejects their licensing application."""
    user = application.user

    if application.status == application.Status.APPROVED:
        subject = "Your Smart PMB licensing application has been approved"
        message = (
            f"Hi {user.full_name or user.email},\n\n"
            f"Your application to be licensed as a {application.get_license_type_display()} "
            f"({application.business_name}) has been approved. "
            f"You can now log in at {settings.FRONTEND_URL}/login and access your account."
        )
    else:
        subject = "Update on your Smart PMB licensing application"
        reason = application.rejection_reason or "No reason was provided."
        message = (
            f"Hi {user.full_name or user.email},\n\n"
            f"Your application to be licensed as a {application.get_license_type_display()} "
            f"({application.business_name}) was not approved.\n\n"
            f"Reason: {reason}\n\n"
            "If you believe this is a mistake, contact the PMB office directly."
        )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
