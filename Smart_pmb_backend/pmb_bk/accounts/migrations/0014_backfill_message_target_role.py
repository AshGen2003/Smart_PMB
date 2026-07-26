# Existing "request" messages (recipient=null) predate the target_role
# field and were visible to any staff account. The UI always called this
# "Send a request to Admin", so backfilling them to target_role="admin"
# preserves that original intent under the new, narrower visibility rule.
from django.db import migrations


def backfill_target_role(apps, schema_editor):
    Message = apps.get_model("accounts", "Message")
    Message.objects.filter(recipient__isnull=True, target_role__isnull=True).update(
        target_role="admin"
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_message_target_role'),
    ]

    operations = [
        migrations.RunPython(backfill_target_role, noop_reverse),
    ]
