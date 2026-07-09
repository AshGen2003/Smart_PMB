from django.conf import settings
from django.db import models


class Province(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(models.Model):
    name = models.CharField(max_length=50)
    province = models.ForeignKey(
        Province, on_delete=models.PROTECT, related_name="districts"
    )

    class Meta:
        unique_together = ("name", "province")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Farmer(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="farmer_profile"
    )
    registration_no = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    nic = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=255, blank=True)
    district = models.ForeignKey(
        District, on_delete=models.SET_NULL, null=True, blank=True, related_name="farmers"
    )
    province = models.ForeignKey(
        Province, on_delete=models.SET_NULL, null=True, blank=True, related_name="farmers"
    )
    land_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    bank_account = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    registered_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.name} ({self.registration_no})"


class PaddyType(models.Model):
    type_name = models.CharField(max_length=100, unique=True)
    variety = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    guaranteed_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["type_name"]

    def __str__(self):
        return self.type_name


class Harvest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        COLLECTED = "collected", "Collected"
        REJECTED = "rejected", "Rejected"

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="harvests")
    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.SET_NULL, null=True, blank=True, related_name="harvests"
    )
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    harvest_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ["-harvest_date"]


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class Method(models.TextChoices):
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        CASH = "cash", "Cash"
        CHEQUE = "cheque", "Cheque"

    harvest = models.ForeignKey(Harvest, on_delete=models.CASCADE, related_name="payments")
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_date = models.DateField(null=True, blank=True)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.BANK_TRANSFER)


class PriceRecord(models.Model):
    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.CASCADE, related_name="price_records"
    )
    guaranteed_price = models.DecimalField(max_digits=10, decimal_places=2)
    effective_date = models.DateField(auto_now_add=True)


class Notification(models.Model):
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-sent_at"]
