from django.db import migrations

NEW_PERMISSIONS = [
    (
        "access_pmb_officer_portal",
        "Access PMB Officer Portal",
        "Use the PMB officer portal: own dashboard, approvals, and the "
        "operational review queues.",
    ),
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

    # Granted only to "pmb_officer" by default, same precedent as migration
    # 0032's access_driver_portal grant to "driver" — this is what
    # app/officer/layout.tsx now checks (see dal.ts's requirePermission),
    # replacing the old requireRole("pmb_officer") check. Without this
    # grant, every existing officer account would be locked out the moment
    # this deploys.
    officer_role = Role.objects.filter(slug="pmb_officer").first()
    if officer_role:
        officer_role.permissions.add(*perms)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0033_portal_access_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_and_grant, noop_reverse),
    ]
