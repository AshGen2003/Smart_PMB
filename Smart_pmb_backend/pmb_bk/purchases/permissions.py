from rest_framework.permissions import BasePermission


class IsAuthorizedPurchaser(BasePermission):
    """Allows access only to authenticated users whose Role slug is "authorized_purchaser"."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role.slug == "authorized_purchaser"
        )
