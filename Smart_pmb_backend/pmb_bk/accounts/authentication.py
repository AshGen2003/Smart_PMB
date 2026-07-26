# Custom JWT authentication: identical to simplejwt's default except the
# user lookup eagerly loads `role` and `role.permissions`.
#
# Nearly every permission class in this app reads `request.user.role` (e.g.
# IsFarmer, IsDriver) or `request.user.role.permissions...` (e.g.
# HasPermission), on literally every authenticated request. The stock
# JWTAuthentication.get_user() does a plain `User.objects.get(id=...)` with
# no select_related, so each of those attribute accesses silently issues
# its own extra query — with the DB hosted remotely (Supabase), each one
# is a real network round trip, and they were stacking up to make even
# trivial single-query views take 1-2+ seconds. See permissions.py's
# _has_codename for the other half of this fix.
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings


class JWTAuthentication(BaseJWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError as e:
            raise InvalidToken(_("Token contained no recognizable user identification")) from e

        try:
            user = (
                self.user_model.objects.select_related("role")
                .prefetch_related("role__permissions")
                .get(**{api_settings.USER_ID_FIELD: user_id})
            )
        except self.user_model.DoesNotExist as e:
            raise AuthenticationFailed(_("User not found"), code="user_not_found") from e

        if api_settings.CHECK_USER_IS_ACTIVE and not user.is_active:
            raise AuthenticationFailed(_("User is inactive"), code="user_inactive")

        return user
