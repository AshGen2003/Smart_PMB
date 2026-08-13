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
    nic = models.CharField(max_length=20, unique=True)
    district = models.ForeignKey(
        "farmers.District", on_delete=models.SET_NULL, null=True, blank=True, related_name="authorized_purchasers"
    )
    phone = models.CharField(max_length=20, blank=True)
    authorized_date = models.DateField(auto_now_add=True)
    # Officer-assigned buying weight limit and government cash advance for
    # this purchaser — set via OfficerAuthorizedPurchaserViewSet, null means
    # "no limit set yet".
    weight_limit_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

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
        # Set by the purchaser themselves (RiceRequestViewSet.confirm_receipt)
        # once they've confirmed receipt of the linked Delivery — the final
        # close-out step after FULFILLED, distinct from the warehouse-side
        # stock accounting that already happened at fulfillment time.
        RECEIVED = "received", "Received"

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


class DispatchManifest(models.Model):
    """
    An Authorized Purchaser's request to transfer a batch of their own
    farm-gate purchases to a PMB warehouse: pending -> approved -> rejected,
    or approved -> dispatched -> delivered once an officer creates the
    actual Delivery (see farmers.Delivery.dispatch_manifest). Individual
    FarmGatePurchase rows are attached via their own `manifest` FK, set in
    bulk at manifest-creation time.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        DISPATCHED = "dispatched", "Dispatched"
        DELIVERED = "delivered", "Delivered"

    purchaser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dispatch_manifests"
    )
    destination_warehouse = models.ForeignKey(
        "farmers.Warehouse", on_delete=models.PROTECT, related_name="incoming_manifests"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_date = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_dispatch_manifests",
    )
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_date"]

    def __str__(self):
        return f"Manifest for {self.purchaser} -> {self.destination_warehouse} ({self.status})"


class FarmGatePurchase(models.Model):
    """
    A direct at-source paddy purchase by an Authorized Purchaser from a
    farmer, at the PaddyType's guaranteed price snapshotted at purchase
    time. Final once recorded -- no edit/delete, only create/list (see
    FarmGatePurchaseViewSet). Counts toward both the purchaser's own
    seasonal weight_limit_kg and the farmer's seasonal selling quota (see
    farmers.views._current_season_channel_totals_kg).
    """

    purchaser = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="farm_gate_purchases"
    )
    farmer = models.ForeignKey("farmers.Farmer", on_delete=models.PROTECT, related_name="farm_gate_purchases")
    paddy_type = models.ForeignKey(
        "farmers.PaddyType", on_delete=models.PROTECT, related_name="farm_gate_purchases"
    )
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    receipt_no = models.CharField(max_length=30, unique=True, db_index=True)
    purchase_date = models.DateField(auto_now_add=True)
    manifest = models.ForeignKey(
        DispatchManifest, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchases"
    )

    class Meta:
        ordering = ["-purchase_date", "-id"]

    def __str__(self):
        return f"{self.receipt_no}: {self.weight_kg}kg from {self.farmer} ({self.purchaser})"
