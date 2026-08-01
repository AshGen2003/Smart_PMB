# Core domain models for the Authorized Purchaser workflow: a purchaser's
# requests for specific paddy/rice types and quantities, and the personal
# stock ledger those requests build up once fulfilled by a PMB officer.
# Mirrors the shape of mills/models.py (Mill owner / License) but for the
# authorized-purchaser actor instead of the mill-owner actor.
from django.conf import settings
from django.db import models


class AuthorizedPurchaser(models.Model):
    """
    A registered authorized purchaser's profile: the purchasing-domain data
    linked one-to-one to a User account with role "authorized_purchaser",
    created together by RegisterLicenseApplicantSerializer in
    accounts/serializers.py (mirrors mills.Mill for the mill-owner actor).
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="authorized_purchaser_profile"
    )
    organization = models.CharField(max_length=150)
    reg_number = models.CharField(max_length=50, blank=True)
    district = models.ForeignKey(
        "farmers.District", on_delete=models.SET_NULL, null=True, blank=True, related_name="authorized_purchasers"
    )
    phone = models.CharField(max_length=20, blank=True)
    authorized_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.organization


class RiceRequest(models.Model):
    """
    An Authorized Purchaser's request for a quantity of a given paddy/rice
    type: pending -> approved -> fulfilled (added to the purchaser's
    PurchaserStock and deducted from the source warehouse), or pending ->
    rejected. A pending request can be withdrawn (deleted) by its owner --
    see RiceRequestViewSet.destroy.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        FULFILLED = "fulfilled", "Fulfilled"

    purchaser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rice_requests"
    )
    paddy_type = models.ForeignKey(
        "farmers.PaddyType", on_delete=models.PROTECT, related_name="rice_requests"
    )
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_date = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_rice_requests",
    )
    fulfilled_from_warehouse = models.ForeignKey(
        "farmers.Warehouse",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fulfilled_rice_requests",
    )
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_date"]

    def __str__(self):
        return f"{self.quantity_kg}kg {self.paddy_type} for {self.purchaser} ({self.status})"


class PurchaserStock(models.Model):
    """
    An Authorized Purchaser's personal running inventory, broken down by
    paddy/rice type. Only ever changed by OfficerRiceRequestViewSet.fulfill
    -- there is no direct write path for a purchaser to edit their own stock.
    """

    purchaser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stock_entries"
    )
    paddy_type = models.ForeignKey(
        "farmers.PaddyType", on_delete=models.PROTECT, related_name="purchaser_stocks"
    )
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ("purchaser", "paddy_type")

    def __str__(self):
        return f"{self.purchaser} holds {self.quantity_kg}kg of {self.paddy_type}"
