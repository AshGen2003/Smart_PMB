from django.db import migrations


def seed_permission(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="impersonate_users",
        defaults={
            "label": "Impersonate Users",
            "description": "Log in as another user's real account for support/debugging, fully audit-logged.",
        },
    )

    # Admin-only by default — this is a genuinely sensitive power (a real
    # identity swap, not read-only Portal Preview), so it's seeded onto
    # "admin" only rather than every role that happens to have manage_users.
    admin_role = Role.objects.filter(slug="admin").first()
    if admin_role:
        admin_role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0027_system_request_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_permission, noop_reverse),
    ]
