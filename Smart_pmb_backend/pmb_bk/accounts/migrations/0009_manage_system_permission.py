from django.db import migrations


def seed_permission(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="manage_system",
        defaults={
            "label": "Manage System Maintenance",
            "description": "Unlock accounts, force logout, run backups, edit system config, resolve alerts.",
        },
    )

    admin_role = Role.objects.filter(slug="admin").first()
    if admin_role:
        admin_role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_user_failed_login_attempts_user_locked_until"),
    ]

    operations = [
        migrations.RunPython(seed_permission, noop_reverse),
    ]
