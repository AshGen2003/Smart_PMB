from django.db import migrations

NEW_PERMISSIONS = [
    (
        "access_driver_portal",
        "Access Driver Portal",
        "Use the driver portal: own dashboard, task accept/reject, delivery "
        "status updates, live-location reporting, and own fuel/maintenance "
        "records.",
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

    # Granted only to "driver" by default, same precedent as migration
    # 0017's view_vehicle_details/view_vehicle_log — this is what the
    # driver portal's views now actually check (see farmers/views.py's
    # DriverDashboardView and friends), replacing the old role-slug-only
    # IsDriver check. Without this grant, every existing driver account
    # would be locked out the moment this deploys.
    driver_role = Role.objects.filter(slug="driver").first()
    if driver_role:
        driver_role.permissions.add(*perms)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0031_role_specific_user_management_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_and_grant, noop_reverse),
    ]
