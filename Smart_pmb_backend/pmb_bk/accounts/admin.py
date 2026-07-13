from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Permission, Role, User


class UserAdmin(BaseUserAdmin):
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
    list_display = ["name", "slug", "is_system"]
    filter_horizontal = ["permissions"]
    search_fields = ["name", "slug"]


class PermissionAdmin(admin.ModelAdmin):
    list_display = ["codename", "label"]
    search_fields = ["codename", "label"]


admin.site.register(User, UserAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Permission, PermissionAdmin)
