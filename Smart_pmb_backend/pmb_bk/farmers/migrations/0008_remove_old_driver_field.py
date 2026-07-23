import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('farmers', '0007_populate_delivery_driver_user'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='delivery',
            name='driver',
        ),
        migrations.AlterField(
            model_name='delivery',
            name='driver_user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='+', to=settings.AUTH_USER_MODEL),
        ),
    ]
