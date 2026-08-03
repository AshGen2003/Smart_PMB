# Enforces the `maintenance_mode` SystemConfig flag (see utils.py's
# CONFIG_DEFS) — before this middleware existed, toggling it from the
# Maintenance page's Settings tab stored the value but nothing ever read
# it back. Implemented as middleware (rather than a check inside every
# view) so a newly added endpoint can't accidentally forget the guard.
from django.http import JsonResponse

from .utils import get_config_value

# Left reachable during maintenance mode: login/refresh so anyone (including
# an admin) can still authenticate, the Stripe webhook since it's a
# machine-to-machine callback with no user session behind it, and Django's
# own admin/static/media paths.
EXEMPT_PATH_PREFIXES = (
    "/api/auth/login/",
    "/api/auth/refresh/",
    "/api/stripe/webhook/",
    "/admin/",
    "/media/",
    "/static/",
)


class MaintenanceModeMiddleware:
    """
    While maintenance_mode is on, blocks every other /api/... request with
    a 503 unless the caller is a Django superuser or an "admin"-role
    account — same bypass reasoning as accounts/permissions.py's
    RoleAccessPermission: a regular admin account must still be able to
    turn the switch back off. Authenticates the request itself (JWT bearer
    token) since Django's own request.user isn't populated until DRF's
    view-level authentication runs, which is too late to gate here.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/") and not request.path.startswith(EXEMPT_PATH_PREFIXES):
            if get_config_value("maintenance_mode"):
                user = self._authenticate(request)
                allowed = user is not None and (
                    user.is_superuser or (user.role_id and user.role.slug == "admin")
                )
                if not allowed:
                    return JsonResponse(
                        {
                            "detail": "Smart PMB is temporarily under maintenance. Please check back soon.",
                            "maintenance": True,
                        },
                        status=503,
                    )
        return self.get_response(request)

    def _authenticate(self, request):
        # Local import avoids a circular import at module load time
        # (accounts imports from sysops.utils elsewhere).
        from accounts.authentication import JWTAuthentication

        try:
            result = JWTAuthentication().authenticate(request)
        except Exception:
            return None
        return result[0] if result else None
