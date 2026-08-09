# Simple role-check permission for endpoints that are only meaningful to
# a farmer's own account (e.g. their dashboard), as opposed to the
# codename-based RBAC checks used for admin/officer endpoints.
from rest_framework.permissions import BasePermission

from accounts.permissions import _has_codename


class IsFarmer(BasePermission):
    """Allows access only to authenticated users whose Role slug is "farmer"."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role.slug == "farmer"
        )


class CanViewVehicles(BasePermission):
    """
    Read access to the vehicle fleet for either manage_transport holders
    (officers, via VehicleViewSet) or access_driver_portal holders (drivers,
    who need the fleet list to log fuel/maintenance against a vehicle on
    their own portal) — write access stays manage_transport-only, checked
    separately in the view.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        if _has_codename(user, "access_driver_portal"):
            return True
        return _has_codename(user, "manage_transport")
