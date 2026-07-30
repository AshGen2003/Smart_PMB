from django.db import models


class Purchase(models.Model):
    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    purchase_id = models.AutoField(primary_key=True)
    farmer_name = models.CharField(max_length=150)
    purchaser = models.ForeignKey(
        "authentication.User",
        on_delete=models.PROTECT,
        related_name="purchases_made",
    )
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="purchases",
    )
    paddy_type = models.CharField(max_length=50)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    amount_lkr = models.DecimalField(max_digits=14, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    purchase_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "purchases"
        indexes = [
            models.Index(fields=["warehouse", "-purchase_date"]),
            models.Index(fields=["payment_status"]),
            models.Index(fields=["-purchase_date"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity_kg__gt=0), name="ck_purchase_quantity_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(amount_lkr__gte=0), name="ck_purchase_amount_non_negative"
            ),
        ]

    def __str__(self):
        return f"#{self.purchase_id} {self.paddy_type} x {self.quantity_kg}kg"
