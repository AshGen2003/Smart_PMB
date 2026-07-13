from django.db import migrations


# manage_users and manage_roles already exist (see 0003) and are the only two
# actually enforced anywhere in the app today. The rest are added so admins
# can define roles ahead of the features that will enforce them (PMB
# officer/licensing/warehouse/logistics work) — assignable and stored now,
# but not yet gating anything until those views exist.
NEW_PERMISSIONS = [
    ("view_audit_logs", "View Audit Logs", "See a history of account and role changes."),
    ("export_data", "Export Data", "Export users, harvests, and reports to file."),
    ("monitor_operations", "Monitor Operations", "View nationwide stock and purchasing activity."),
    ("approve_licenses", "Approve Licenses", "Review and approve rice mill license applications."),
    ("manage_pricing", "Manage Pricing", "Set and update guaranteed paddy prices."),
    ("manage_warehouses", "Manage Warehouses", "Manage warehouse stock and capacity."),
    ("record_purchases", "Record Purchases", "Record and verify paddy purchase transactions."),
    ("generate_reports", "Generate Reports", "Create and view nationwide operational reports."),
]


def seed_more_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    created = []
    for codename, label, description in NEW_PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"label": label, "description": description}
        )
        created.append(perm)

    # Admin keeps full access, matching what it already implies today.
    admin_role = Role.objects.filter(slug="admin").first()
    if admin_role:
        admin_role.permissions.add(*created)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_user_role_finalize"),
    ]

    operations = [
        migrations.RunPython(seed_more_permissions, noop_reverse),
    ]
