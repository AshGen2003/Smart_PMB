from django.db import migrations


def seed_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Permission = apps.get_model("accounts", "Permission")

    role, _ = Role.objects.get_or_create(
        slug="transport_operator",
        defaults={"name": "Transport Operator", "is_system": True},
    )

    # Reuses the existing manage_transport permission (seeded in
    # 0012_manage_transport_permission.py) — every transportation
    # ViewSet/view is already gated purely on this codename, not on a role
    # check, so granting it here is enough to give a Transport Operator
    # full fleet/route/delivery management without any new backend views.
    perm = Permission.objects.filter(codename="manage_transport").first()
    if perm:
        role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_manage_transport_permission"),
    ]

    operations = [
        migrations.RunPython(seed_role, noop_reverse),
    ]
