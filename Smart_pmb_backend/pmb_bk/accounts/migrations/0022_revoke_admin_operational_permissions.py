from django.db import migrations


# Approvals, Licenses, Mill Licenses, and Rice Requests are PMB-officer
# operational duties (day-to-day paddy purchasing, mill licensing, rice
# requests) — not system administration. Every one of those four pages is
# already gated by one of these three permissions (see Sidebar.tsx's
# NAV_ITEMS and the corresponding HasPermission/HasAnyPermission checks in
# farmers/mills/purchases/accounts views.py), so removing them from `admin`
# alone hides all four pages via the existing gating, with no other code
# changes. `pmb_officer` keeps all three untouched — officers still handle
# these duties in full.
REVOKED_CODENAMES = ["approve_licenses", "monitor_operations", "record_purchases"]


def revoke_admin_operational_permissions(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Permission = apps.get_model("accounts", "Permission")

    admin_role = Role.objects.filter(slug="admin").first()
    if not admin_role:
        return

    perms = Permission.objects.filter(codename__in=REVOKED_CODENAMES)
    admin_role.permissions.remove(*perms)


def restore_admin_operational_permissions(apps, schema_editor):
    """Reverse migration: re-grants the three permissions back to admin (undoes the removal above)."""
    Role = apps.get_model("accounts", "Role")
    Permission = apps.get_model("accounts", "Permission")

    admin_role = Role.objects.filter(slug="admin").first()
    if not admin_role:
        return

    perms = Permission.objects.filter(codename__in=REVOKED_CODENAMES)
    admin_role.permissions.add(*perms)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0021_pmb_officer_profile"),
    ]

    operations = [
        migrations.RunPython(
            revoke_admin_operational_permissions, restore_admin_operational_permissions
        ),
    ]
