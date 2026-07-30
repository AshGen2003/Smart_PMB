from django.db import models


class Approval(models.Model):
    approval_id = models.AutoField(primary_key=True)
    officer = models.ForeignKey(
        "authentication.User", on_delete=models.PROTECT, related_name="approvals"
    )
    entity_type = models.CharField(max_length=50)
    entity_id = models.IntegerField()
    action = models.CharField(max_length=50)
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "approvals"
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.action} on {self.entity_type}#{self.entity_id}"
