from rest_framework.permissions import SAFE_METHODS, BasePermission


def _has_codename(user, codename):
    return user.role.permissions.filter(codename=codename).exists()


class HasPermission(BasePermission):
    """Factory-style DRF permission: HasPermission("manage_users")."""

    def __init__(self, codename):
        self.codename = codename

    def __call__(self):
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
