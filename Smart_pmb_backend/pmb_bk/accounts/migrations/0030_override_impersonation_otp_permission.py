from django.db import migrations


def seed_permission(apps, schema_editor):
    Permission = apps.get_model("accounts", "Permission")
    Role = apps.get_model("accounts", "Role")

    perm, _ = Permission.objects.get_or_create(
        codename="override_impersonation_otp",
        defaults={
            "label": "Override Impersonation Consent",
            "description": (
                "Sign in as another user's account without their emailed "
                "one-time code, for cases where the account holder can't be "
                "reached (locked out, unresponsive). Requires a written "
                "reason; fully audit-logged and still notifies the account "
                "holder afterward."
            ),
        },
    )

    # Admin-only by default, same reasoning as impersonate_users itself —
    # this is strictly stronger (bypasses the account holder's consent
    # step entirely), so it's seeded no more broadly than that.
    admin_role = Role.objects.filter(slug="admin").first()
    if admin_role:
        admin_role.permissions.add(perm)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0029_impersonationotp"),
    ]

    operations = [
        migrations.RunPython(seed_permission, noop_reverse),
    ]
