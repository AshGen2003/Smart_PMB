import django.db.models.deletion
from django.db import migrations, models


def populate_role_fk(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Role = apps.get_model("accounts", "Role")
    role_map = {r.slug: r for r in Role.objects.all()}
    fallback = role_map["farmer"]

    for user in User.objects.all():
        user.role_fk = role_map.get(user.role, fallback)
        user.save(update_fields=["role_fk"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_role_permission"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role_fk",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="users",
                to="accounts.role",
            ),
        ),
        migrations.RunPython(populate_role_fk, noop_reverse),
    ]
