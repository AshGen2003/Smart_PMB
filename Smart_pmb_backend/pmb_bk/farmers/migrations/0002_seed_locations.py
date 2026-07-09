from django.db import migrations

PROVINCES = [
    "Western", "Central", "Southern", "Northern", "Eastern",
    "North Western", "North Central", "Uva", "Sabaragamuwa",
]

DISTRICTS = [
    ("Colombo", "Western"), ("Gampaha", "Western"), ("Kalutara", "Western"),
    ("Kandy", "Central"), ("Matale", "Central"), ("Nuwara Eliya", "Central"),
    ("Galle", "Southern"), ("Matara", "Southern"), ("Hambantota", "Southern"),
    ("Jaffna", "Northern"), ("Kilinochchi", "Northern"), ("Mannar", "Northern"),
    ("Vavuniya", "Northern"), ("Mullaitivu", "Northern"),
    ("Ampara", "Eastern"), ("Batticaloa", "Eastern"), ("Trincomalee", "Eastern"),
    ("Kurunegala", "North Western"), ("Puttalam", "North Western"),
    ("Anuradhapura", "North Central"), ("Polonnaruwa", "North Central"),
    ("Badulla", "Uva"), ("Monaragala", "Uva"),
    ("Ratnapura", "Sabaragamuwa"), ("Kegalle", "Sabaragamuwa"),
]


def seed_locations(apps, schema_editor):
    Province = apps.get_model("farmers", "Province")
    District = apps.get_model("farmers", "District")

    provinces_by_name = {}
    for name in PROVINCES:
        province, _ = Province.objects.get_or_create(name=name)
        provinces_by_name[name] = province

    for district_name, province_name in DISTRICTS:
        District.objects.get_or_create(
            name=district_name, province=provinces_by_name[province_name]
        )


def unseed_locations(apps, schema_editor):
    District = apps.get_model("farmers", "District")
    Province = apps.get_model("farmers", "Province")
    District.objects.filter(name__in=[d for d, _ in DISTRICTS]).delete()
    Province.objects.filter(name__in=PROVINCES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("farmers", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_locations, unseed_locations),
    ]
