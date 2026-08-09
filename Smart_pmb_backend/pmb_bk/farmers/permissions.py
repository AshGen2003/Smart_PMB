from rest_framework.permissions import BasePermission

from accounts.permissions import _has_codename


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
