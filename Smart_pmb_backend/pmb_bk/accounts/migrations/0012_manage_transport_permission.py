from django.db import migrations


def seed_permission(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="manage_transport",
        defaults={
            "label": "Manage Transportation",
            "description": "Manage vehicles, drivers, routes, and deliveries.",
        },
    )

    # Granted to PMB Officer directly (not Admin) — matches manage_warehouses
    # and manage_pricing, which Admin only reaches via Portal Preview rather
    # than holding outright.
    officer_role = Role.objects.filter(slug="pmb_officer").first()
    if officer_role:
        officer_role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0011_message"),
    ]

    operations = [
        migrations.RunPython(seed_permission, noop_reverse),
    ]
