from django.db import migrations


def seed_permission(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="appoint_warehouse_managers",
        defaults={
            "label": "Appoint Warehouse Managers",
            "description": "Create or reassign warehouse_manager accounts for a warehouse.",
        },
    )

    # Granted to PMB Officer (day-to-day warehouse operations) and Admin
    # (full governance) — matches manage_warehouses' grant set.
    for slug in ("pmb_officer", "admin"):
        role = Role.objects.filter(slug=slug).first()
        if role:
            role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0023_password_reset_otp"),
    ]

    operations = [
        migrations.RunPython(seed_permission, noop_reverse),
    ]
