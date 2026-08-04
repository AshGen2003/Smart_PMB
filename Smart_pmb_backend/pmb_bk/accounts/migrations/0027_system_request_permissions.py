from django.db import migrations


def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    request_perm, _ = Permission.objects.get_or_create(
        codename="request_system_changes",
        defaults={
            "label": "Request System Changes",
            "description": "Submit a system-change request to the admin (token/payment workflow).",
        },
    )
    manage_perm, _ = Permission.objects.get_or_create(
        codename="manage_system_requests",
        defaults={
            "label": "Manage System Change Requests",
            "description": "Review, accept/reject, and track progress on officer system-change requests.",
        },
    )

    officer_role = Role.objects.filter(slug="pmb_officer").first()
    if officer_role:
        officer_role.permissions.add(request_perm)

    admin_role = Role.objects.filter(slug="admin").first()
    if admin_role:
        admin_role.permissions.add(manage_perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0026_alter_role_dashboard_widgets"),
    ]

    operations = [
        migrations.RunPython(seed_permissions, noop_reverse),
    ]
