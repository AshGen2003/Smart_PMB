from django.db import migrations


def seed_and_grant(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="view_admin_dashboard",
        defaults={
            "label": "View Admin Dashboard",
            "description": (
                "See the full admin overview dashboard (org-wide KPIs, charts, "
                "recent activity) on /dashboard instead of the officer or "
                "generic view. Previously this was decided by manage_users, "
                "which meant granting Users-tab access also silently switched "
                "a role's dashboard to the admin view — now a separate, "
                "dedicated permission."
            ),
        },
    )

    # Unlike the view_dashboard/view_messages/view_settings/view_profile
    # sidebar-visibility permissions, this one is NOT backfilled to every
    # role — it's inherently admin-specific, so only the existing "admin"
    # role gets it (matching current real-world behavior: admin already
    # saw this view via manage_users, everyone else did not).
    admin_role = Role.objects.filter(slug="admin").first()
    if admin_role:
        admin_role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_sidebar_visibility_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_and_grant, noop_reverse),
    ]
