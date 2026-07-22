# Simple role-check permission for endpoints that are only meaningful to
# a farmer's own account (e.g. their dashboard), as opposed to the
# codename-based RBAC checks used for admin/officer endpoints.
from rest_framework.permissions import BasePermission


class IsFarmer(BasePermission):
    """Allows access only to authenticated users whose Role slug is "farmer"."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role.slug == "farmer"
        )
