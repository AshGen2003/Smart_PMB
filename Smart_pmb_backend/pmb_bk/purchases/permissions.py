from rest_framework.permissions import BasePermission


class IsAuthorizedPurchaser(BasePermission):
    """
    Allows access only to authenticated users whose Role slug is
    "authorized_purchaser" AND, if they self-registered via a
    LicenseApplication, whose application has been approved. Mirrors the
    frontend's PendingLicenseScreen gate (my-app/app/partner/layout.tsx) so a
    pending/rejected applicant can't bypass that holding screen by calling
    the API directly with their valid JWT. `license_application` legitimately
    doesn't exist for admin-created purchaser accounts (no self-registration
    = no application to gate on), so those are allowed through
    unconditionally, same as the frontend.
    """

    message = "Your license application is still under review."

    def has_permission(self, request, view):
        if not bool(
            request.user
            and request.user.is_authenticated
            and request.user.role.slug == "authorized_purchaser"
        ):
            return False
        application = getattr(request.user, "license_application", None)
        return application is None or application.status == application.Status.APPROVED
