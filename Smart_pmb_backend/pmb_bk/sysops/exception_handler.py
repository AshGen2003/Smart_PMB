# Custom DRF exception handler, registered via
# REST_FRAMEWORK['EXCEPTION_HANDLER'] in pmb_bk/settings.py. Every exception
# any API view raises passes through here first — including ones DRF's own
# default handler doesn't recognize (arbitrary bugs), which it lets
# propagate unchanged rather than turning into a response. This gives one
# central hook that logs an ErrorLog entry for all of them, present and
# future, without each view needing its own try/except.
import logging

from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Delegates to DRF's default exception_handler for the actual response
    (unchanged), then best-effort logs the exception to ErrorLog. Logging
    itself is wrapped in its own try/except: a bug in the logging code must
    never mask the original exception or break the request a second time.
    """
    response = drf_exception_handler(exc, context)

    request = context.get("request")
    try:
        from .models import ErrorLog

        user = getattr(request, "user", None) if request else None
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        ErrorLog.objects.create(
            user=user if is_authenticated else None,
            actor_label=user.email if is_authenticated else "",
            method=request.method if request else "",
            path=request.path if request else "",
            exception_type=type(exc).__name__,
            message=str(exc)[:2000],
            status_code=response.status_code if response is not None else None,
        )
    except Exception:
        logger.exception("Failed to write ErrorLog entry")

    return response
