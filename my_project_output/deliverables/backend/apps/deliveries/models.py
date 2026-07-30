from django.db import models


class Delivery(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    delivery_id = models.AutoField(primary_key=True)
    purchase = models.ForeignKey(
        "purchases.Purchase",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
    )
    vehicle_number = models.CharField(max_length=50, blank=True, default="")
    driver_name = models.CharField(max_length=120, blank=True, default="")
    pickup_location = models.CharField(max_length=200)
    drop_location = models.CharField(max_length=200)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    delivery_date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "deliveries"
        indexes = [
            models.Index(fields=["-delivery_date"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"Delivery #{self.delivery_id} → {self.drop_location}"
