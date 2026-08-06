from django.db import migrations


PERMISSIONS = [
    (
        "manage_farmers",
        "Manage Farmers",
        "View, edit, and delete farmer accounts. Does not include creating "
        "one — farmer accounts are only ever created via self-registration.",
    ),
    (
        "manage_drivers",
        "Manage Drivers",
        "View, edit, delete, and create driver accounts.",
    ),
    (
        "manage_warehouse_managers",
        "Manage Warehouse Managers",
        "View, edit, delete, and create warehouse manager accounts.",
    ),
    (
        "manage_mill_owners",
        "Manage Mill Owners",
        "View, edit, and delete mill owner accounts. Does not include "
        "creating one — mill owner accounts are only ever created via the "
        "licensing application flow.",
    ),
    (
        "manage_purchasers",
        "Manage Purchasers",
        "View, edit, and delete authorized purchaser accounts. Does not "
        "include creating one — purchaser accounts are only ever created "
        "via the licensing application flow.",
    ),
]


def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")

    # Deliberately granted to no role by default (same as
    # override_impersonation_otp) — an admin grants whichever of these an
    # officer actually needs via the Roles page. Narrower alternatives to
    # manage_users, which already covers all of them at once.
    for codename, label, description in PERMISSIONS:
        Permission.objects.get_or_create(
            codename=codename,
            defaults={"label": label, "description": description},
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0030_override_impersonation_otp_permission"),
    ]

    operations = [
        migrations.RunPython(seed_permissions, noop_reverse),
    ]
