"""Permission helpers for the Logistics Module.

All endpoints require an authenticated user by default (see
``REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES`` in settings). The classes below
are provided for finer-grained control if you later introduce role-based
access (e.g. only PMB officers may approve deliveries)."""
from rest_framework import permissions


class IsPmbOfficer(permissions.BasePermission):
    """Allows access only to users flagged as PMB officers."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_staff", False)
        )
