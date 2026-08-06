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



# Read-only access to the role catalogue: anyone who can manage even one
# slice of users needs this to populate their create/edit form's role
# picker — see RoleAccessPermission below.
_ROLE_READ_CODENAMES = (
    "manage_users",
    "manage_roles",
    "manage_farmers",
    "manage_drivers",
    "manage_warehouse_managers",
    "manage_mill_owners",
    "manage_purchasers",
)


class RoleAccessPermission(BasePermission):
    """
    Read access (list/retrieve) to roles requires manage_roles or any of
    the manage_users/manage_<role> permissions in _ROLE_READ_CODENAMES —
    holding any one of them means populating a user create/edit form
    somewhere, which needs the role catalogue regardless of which slice
    of users that permission actually covers. Write access
    (create/update/destroy) requires manage_roles specifically.

    "admin"-role accounts always pass, regardless of their actual
    permission set — a lockout safety net. Without this, a regular admin
    account could strip manage_roles from the "admin" Role itself (e.g. by
    editing it on /roles) and lock every admin out of the one screen that
    could undo it. Scoped to this permission class only: every other
    HasPermission/HasAnyPermission check in the app still respects
    whatever's actually configured on the admin role.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        if user.role_id and user.role.slug == "admin":
            return True
        if request.method in SAFE_METHODS:
            return any(_has_codename(user, c) for c in _ROLE_READ_CODENAMES)
        return _has_codename(user, "manage_roles")
