# DRF permission classes implementing the app's custom RBAC checks.
# Views declare required permission codenames (e.g. HasPermission("manage_users"))
# and DRF calls has_permission() on every request to decide whether to allow it.
# Superusers always bypass these checks.
from rest_framework.permissions import SAFE_METHODS, BasePermission


def _has_codename(user, codename):
    """
    True if the user's assigned Role grants the given permission codename.
    Checked against `role.permissions.all()` (in-memory, from the
    prefetch_related done in accounts/authentication.py) rather than a
    fresh `.filter(...).exists()` query — a `.filter()` on a prefetched
    related manager always re-hits the DB, so with the DB hosted remotely,
    this avoided a separate network round trip per codename checked (views
    using HasAnyPermission check more than one).
    """
    return any(p.codename == codename for p in user.role.permissions.all())


class HasPermission(BasePermission):
    """Factory-style DRF permission: HasPermission("manage_users")."""

    def __init__(self, codename):
        self.codename = codename

    def __call__(self):
        # DRF instantiates permission classes with no args (e.g. `Perm()`
        # in permission_classes lists), so HasPermission("x") is used as a
        # ready-made instance that also behaves like a class when called.
        return self

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        return _has_codename(user, self.codename)


class HasAnyPermission(BasePermission):
    """Factory-style DRF permission: HasAnyPermission("manage_users", "manage_roles")."""

    def __init__(self, *codenames):
        # Grants access if the user has ANY one of these codenames.
        self.codenames = codenames

    def __call__(self):
        return self

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        return any(_has_codename(user, c) for c in self.codenames)


class RoleAccessPermission(BasePermission):
    """
    Read access (list/retrieve) to roles requires either manage_users or
    manage_roles — a manage_users-only role still needs to read the role
    catalogue to populate the user-edit form's role picker. Write access
    (create/update/destroy) requires manage_roles specifically.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return _has_codename(user, "manage_users") or _has_codename(
                user, "manage_roles"
            )
        return _has_codename(user, "manage_roles")
