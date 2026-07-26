from django.db import migrations

NEW_PERMISSIONS = [
    ("view_dashboard", "View Dashboard", "See the Dashboard link in the sidebar and its page."),
    ("view_messages", "View Messages", "See the Messages link in the sidebar and its page."),
    ("view_settings", "View Settings", "See the Settings link in the sidebar and its page."),
    ("view_profile", "View Profile", "See the Profile link in the sidebar and its page."),
]


def seed_and_backfill(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perms = []
    for codename, label, description in NEW_PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"label": label, "description": description}
        )
        perms.append(perm)

    # Grant every existing role all four by default so nothing changes for
    # current users the moment this migration runs — an admin has to
    # deliberately uncheck one afterward (via /roles or the Preview Portal's
    # quick-toggle checklist) to actually hide it.
    for role in Role.objects.all():
        role.permissions.add(*perms)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_backfill_message_target_role"),
    ]

    operations = [
        migrations.RunPython(seed_and_backfill, noop_reverse),
    ]
