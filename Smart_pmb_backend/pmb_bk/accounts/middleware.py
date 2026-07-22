# Middleware that stamps User.last_activity on every authenticated
# request, giving the "currently online" feature (accounts/views.py's
# OnlineRolesView) a cheap way to know who's actively using the app right
# now — JWT auth is stateless, so there's no session table to query
# instead.
from django.utils import timezone

# Only write to the DB if the existing stamp is older than this, so a user
# clicking around rapidly doesn't trigger a write on every single request.
MIN_UPDATE_INTERVAL_SECONDS = 60


class UpdateLastActivityMiddleware:
    """
    Stamps `request.user.last_activity` after the view has run. DRF's
    `Request.user` setter also writes back to the underlying Django
    `HttpRequest` (for backwards compatibility with exactly this kind of
    middleware), so by the time `get_response()` returns, `request.user`
    reflects whichever user DRF's JWT authentication resolved — even though
    this middleware itself knows nothing about JWTs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            now = timezone.now()
            if not user.last_activity or (now - user.last_activity).total_seconds() > MIN_UPDATE_INTERVAL_SECONDS:
                # .update() instead of .save() — avoids re-writing every
                # field on the user and re-running save()'s side effects
                # for what is purely a presence heartbeat.
                type(user).objects.filter(pk=user.pk).update(last_activity=now)

        return response
