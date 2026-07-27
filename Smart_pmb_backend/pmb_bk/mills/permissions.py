# Simple role-check permission for endpoints that are only meaningful to a
# mill owner's own account, mirroring farmers/permissions.py's IsFarmer.
from rest_framework.permissions import BasePermission


class IsMillOwner(BasePermission):
    """Allows access only to authenticated users whose Role slug is "mill_owner"."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role.slug == "mill_owner"
        )
