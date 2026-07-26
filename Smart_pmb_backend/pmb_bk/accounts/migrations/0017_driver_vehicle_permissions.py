from django.db import migrations

NEW_PERMISSIONS = [
    ("view_vehicle_details", "View Vehicle Details", "See the Vehicle Details link in the driver sidebar and its page."),
    ("view_vehicle_log", "View Vehicle Log", "See the Vehicle Log link in the driver sidebar and its page."),
]


def seed_and_grant(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perms = []
    for codename, label, description in NEW_PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"label": label, "description": description}
        )
        perms.append(perm)

    # Driver-specific pages — not backfilled to every role like the
    # view_dashboard/view_messages/view_settings/view_profile sidebar-
    # visibility permissions, only to "driver" (matching view_admin_dashboard's
    # admin-only precedent in migration 0016).
    driver_role = Role.objects.filter(slug="driver").first()
    if driver_role:
        driver_role.permissions.add(*perms)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0016_view_admin_dashboard_permission"),
    ]

    operations = [
        migrations.RunPython(seed_and_grant, noop_reverse),
    ]
