from django.db import migrations

# (codename, label, description, role_slug) — mirrors migration 0032's
# access_driver_portal precedent for the remaining operational roles.
# Each was previously gated by a hardcoded request.user.role.slug == "..."
# check (IsFarmer / IsMillOwner / IsAuthorizedPurchaser, or no check at all
# for warehouse_manager — see farmers/views.py's WarehouseManager* views,
# which relied purely on Warehouse.managed_by data scoping) that never
# consulted the Role/Permission system admin/officer endpoints already use.
NEW_PERMISSIONS = [
    (
        "access_farmer_portal",
        "Access Farmer Portal",
        "Use the farmer portal: own dashboard, bank details, notifications, "
        "and harvest submissions.",
        "farmer",
    ),
    (
        "access_mill_owner_portal",
        "Access Mill Owner Portal",
        "Use the mill owner portal: own dashboard, mill profile, license "
        "applications, and milling reports.",
        "mill_owner",
    ),
    (
        "access_purchaser_portal",
        "Access Purchaser Portal",
        "Use the authorized purchaser portal: own dashboard, stock on "
        "hand, and rice requests.",
        "authorized_purchaser",
    ),
    (
        "access_warehouse_manager_portal",
        "Access Warehouse Manager Portal",
        "Use the warehouse manager portal: own warehouse dashboard, stock "
        "adjustment, transaction history, transfer requests, and capacity "
        "alerts.",
        "warehouse_manager",
    ),
]


def seed_and_grant(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    for codename, label, description, role_slug in NEW_PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"label": label, "description": description}
        )
        role = Role.objects.filter(slug=role_slug).first()
        if role:
            role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0032_access_driver_portal_permission"),
    ]

    operations = [
        migrations.RunPython(seed_and_grant, noop_reverse),
    ]
