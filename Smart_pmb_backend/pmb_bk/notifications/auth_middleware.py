"""
ASGI middleware authenticating WebSocket connections against this app's
own JWT-in-httpOnly-cookie scheme -- deliberately NOT Channels' built-in
AuthMiddlewareStack, which assumes Django's session framework (this app
has never used Django sessions for auth; see accounts/authentication.py's
JWTAuthentication for the DRF-side equivalent).

Reuses rest_framework_simplejwt's own AccessToken validation (same
SIMPLE_JWT settings the REST API validates against) rather than hand-
rolling a second JWT decode path that could drift out of sync with it.
"""
from http.cookies import SimpleCookie

from rest_framework_simplejwt.tokens import AccessToken, TokenError


def _access_token_from_scope(scope):
    """Pulls the raw access_token cookie value out of an ASGI scope's raw headers, or None."""
    for name, value in scope.get("headers", []):
        if name == b"cookie":
            cookie = SimpleCookie()
            cookie.load(value.decode("latin-1"))
            morsel = cookie.get("access_token")
            return morsel.value if morsel else None
    return None


class CookieJWTAuthMiddleware:
    """
    Validates the access_token cookie once, at connect time, and stashes
    the user id/role slug directly on the scope -- both are already JWT
    claims (see CustomTokenObtainPairSerializer.get_token,
    accounts/serializers.py), so this never needs a database round trip.

    Known tradeoff: unlike DRF's JWTAuthentication, this does not re-check
    is_active against the database, so a deactivated account could keep
    receiving pushes on an already-open socket until its access token
    naturally expires (<=15 minutes, see SIMPLE_JWT.ACCESS_TOKEN_LIFETIME).
    Acceptable here: this consumer only ever delivers a user's own
    notifications, never privileged data, and the underlying REST API
    (which does re-check is_active on every request) is unaffected.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope["ws_user_id"] = None
        scope["ws_role_slug"] = None

        raw_token = _access_token_from_scope(scope)
        if raw_token:
            try:
                token = AccessToken(raw_token)
            except TokenError:
                token = None
            if token is not None:
                scope["ws_user_id"] = token.get("sub")
                scope["ws_role_slug"] = token.get("role")

        return await self.app(scope, receive, send)
