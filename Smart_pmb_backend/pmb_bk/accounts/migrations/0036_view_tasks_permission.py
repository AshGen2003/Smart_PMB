from django.db import migrations

NEW_PERMISSIONS = [
    ("view_tasks", "View Tasks", "See the Tasks link in the driver sidebar and its page."),
]

# Cosmetic: the driver sidebar's "Vehicle Details" link is being relabeled
# "Assigned Vehicles" -- update the stored permission text so /roles doesn't
# show stale wording. Codename itself is unchanged (nothing else references
# the old label).
UPDATED_PERMISSIONS = {
    "view_vehicle_details": (
        "View Assigned Vehicles",
        "See the Assigned Vehicles link in the driver sidebar and its page.",
    ),
}


def seed_and_grant(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perms = []
    for codename, label, description in NEW_PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"label": label, "description": description}
        )
        perms.append(perm)

    for codename, (label, description) in UPDATED_PERMISSIONS.items():
        Permission.objects.filter(codename=codename).update(label=label, description=description)

    # Driver-specific page — not backfilled to every role, matching
    # view_vehicle_details/view_vehicle_log's precedent in migration 0017.
    driver_role = Role.objects.filter(slug="driver").first()
    if driver_role:
        driver_role.permissions.add(*perms)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0035_licenseapplication_document_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_and_grant, noop_reverse),
    ]
