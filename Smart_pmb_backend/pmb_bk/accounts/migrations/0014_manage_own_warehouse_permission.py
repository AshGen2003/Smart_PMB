from django.db import migrations


def seed_permission(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    # Deliberately a distinct codename from "manage_warehouses" (the
    # officer's blanket CRUD over every warehouse in the system) — this one
    # only ever backs views scoped to a Warehouse Manager's own assigned
    # warehouse(s), never the global queryset.
    perm, _ = Permission.objects.get_or_create(
        codename="manage_own_warehouse",
        defaults={
            "label": "Manage Own Warehouse",
            "description": "Manage stock and intake for one's assigned warehouse(s).",
        },
    )

    manager_role = Role.objects.filter(slug="warehouse_manager").first()
    if manager_role:
        manager_role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0013_transport_operator_role"),
    ]

    operations = [
        migrations.RunPython(seed_permission, noop_reverse),
    ]
