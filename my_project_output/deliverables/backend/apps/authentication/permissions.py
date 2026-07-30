from rest_framework.permissions import BasePermission


class IsPmbOfficer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "PMB_OFFICER"
        )


class IsAuthorizedPurchaser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "AUTHORIZED_PURCHASER"
        )


class IsPmbOfficerOrPurchaser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("PMB_OFFICER", "AUTHORIZED_PURCHASER")
        )
