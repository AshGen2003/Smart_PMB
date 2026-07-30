from django.db import models


class Warehouse(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        INACTIVE = "INACTIVE", "Inactive"

    warehouse_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120)
    district = models.CharField(max_length=80, db_index=True)
    location = models.CharField(max_length=200)
    capacity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    current_stock_kg = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "warehouses"
        indexes = [
            models.Index(fields=["district", "status"]),
            models.Index(fields=["-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacity_kg__gt=0), name="ck_warehouse_capacity_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(current_stock_kg__gte=0),
                name="ck_warehouse_stock_non_negative",
            ),
        ]

    @property
    def utilization_pct(self):
        if self.capacity_kg and self.capacity_kg > 0:
            return round(float(self.current_stock_kg) / float(self.capacity_kg) * 100, 1)
        return 0.0

    @property
    def remaining_kg(self):
        return max(0, float(self.capacity_kg) - float(self.current_stock_kg))

    def __str__(self):
        return f"{self.name} ({self.district})"


class Inventory(models.Model):
    inventory_id = models.AutoField(primary_key=True)
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.CASCADE, related_name="inventory_items"
    )
    paddy_type = models.CharField(max_length=50)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    storage_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = "inventory"
        indexes = [
            models.Index(fields=["warehouse", "-storage_date"]),
        ]

    def __str__(self):
        return f"{self.paddy_type} x {self.quantity_kg}kg @ {self.warehouse.name}"
