from django.db import migrations, models


SEED_ROLES = [
    ("admin", "Admin"),
    ("moderator", "Moderator"),
    ("pmb_officer", "PMB Officer"),
    ("farmer", "Farmer"),
    ("mill_owner", "Mill Owner"),
    ("driver", "Driver"),
    ("warehouse_manager", "Warehouse Manager"),
    ("authorized_purchaser", "Authorized Purchaser"),
]

SEED_PERMISSIONS = [
    ("manage_users", "Manage Users", "Create, edit, deactivate, and delete user accounts."),
    ("manage_roles", "Manage Roles", "Create and edit roles, and grant permissions to them."),
]


def seed_roles_and_permissions(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Permission = apps.get_model("accounts", "Permission")

    role_objs = {}
    for slug, name in SEED_ROLES:
        role_objs[slug] = Role.objects.create(name=name, slug=slug, is_system=True)

    perm_objs = []
    for codename, label, description in SEED_PERMISSIONS:
        perm_objs.append(
            Permission.objects.create(codename=codename, label=label, description=description)
        )

    role_objs["admin"].permissions.set(perm_objs)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_email_confirmed"),
    ]

    operations = [
        migrations.CreateModel(
            name="Permission",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("codename", models.CharField(max_length=50, unique=True)),
                ("label", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
            ],
            options={"ordering": ["codename"]},
        ),
        migrations.CreateModel(
            name="Role",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
                ("is_system", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "permissions",
                    models.ManyToManyField(
                        blank=True, related_name="roles", to="accounts.permission"
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.RunPython(seed_roles_and_permissions, noop_reverse),
    ]
