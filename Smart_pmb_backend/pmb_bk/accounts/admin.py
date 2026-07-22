# Django admin site registrations for the accounts app. These control how
# User, Role, and Permission records appear and are edited in the built-in
# /admin/ site (separate from the app's own DRF admin API in views.py).
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Permission, Role, User


class UserAdmin(BaseUserAdmin):
    """Admin config for User: email-based ordering/search and a Security section for lockout fields."""
    ordering = ["email"]
    list_display = ["email", "full_name", "role", "is_staff", "locked_until"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Security",
            {
                # Break-glass unlock: clear both fields here to lift a
                # lockout early instead of waiting out LOGIN_LOCKOUT_MINUTES.
                "fields": ("failed_login_attempts", "locked_until"),
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )
    search_fields = ["email", "full_name"]


class RoleAdmin(admin.ModelAdmin):
    """Admin config for Role, with a widget for assigning permissions."""
    list_display = ["name", "slug", "is_system"]
    filter_horizontal = ["permissions"]
    search_fields = ["name", "slug"]


class PermissionAdmin(admin.ModelAdmin):
    """Admin config for Permission (read-mostly reference data)."""
    list_display = ["codename", "label"]
    search_fields = ["codename", "label"]


admin.site.register(User, UserAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Permission, PermissionAdmin)
