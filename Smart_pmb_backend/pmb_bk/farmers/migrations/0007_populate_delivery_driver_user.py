from django.db import migrations


def populate_driver_user(apps, schema_editor):
    Delivery = apps.get_model("farmers", "Delivery")
    User = apps.get_model("accounts", "User")

    for delivery in Delivery.objects.select_related("driver").all():
        user = User.objects.filter(full_name=delivery.driver.name, role__slug="driver").first()
        if user:
            delivery.driver_user = user
            delivery.save(update_fields=["driver_user"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("farmers", "0006_delivery_driver_user"),
    ]

    operations = [
        migrations.RunPython(populate_driver_user, noop_reverse),
    ]
