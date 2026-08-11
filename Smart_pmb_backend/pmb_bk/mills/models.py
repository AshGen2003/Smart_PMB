# Core domain models for the rice mill licensing business: a mill owner's
# profile, their license applications and the approval workflow, and their
# periodic milling reports. Mirrors the shape of farmers/models.py (Farmer /
# Harvest) but for the mill-owner actor instead of the farmer actor.
from django.conf import settings
from django.db import models


class Mill(models.Model):
    """
    A registered rice mill's profile: the mill-owner-domain data linked
    one-to-one to a User account with role "mill_owner" (created together
    by RegisterMillOwnerSerializer in accounts/serializers.py).
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mill_profile"
    )
    registration_no = models.CharField(max_length=50, unique=True)
    mill_name = models.CharField(max_length=150)
    owner_name = models.CharField(max_length=100)
    nic = models.CharField(max_length=20, unique=True)
    business_reg_no = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=255, blank=True)
    district = models.ForeignKey(
        "farmers.District", on_delete=models.SET_NULL, null=True, blank=True, related_name="mills"
    )
    province = models.ForeignKey(
        "farmers.Province", on_delete=models.SET_NULL, null=True, blank=True, related_name="mills"
    )
    capacity_mt_per_day = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    contact_number = models.CharField(max_length=20, blank=True)
    registered_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.mill_name} ({self.registration_no})"


class License(models.Model):
    """
    A mill's license application and its approval workflow: pending ->
    approved (an officer assigns a license number, issue/expiry dates) or
    pending -> rejected. See OfficerLicenseViewSet's approve/reject actions
    in views.py for the transitions. A pending application can be deleted
    by its owner — that deletion *is* the "withdraw" action, so there is no
    separate "withdrawn" status.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    mill = models.ForeignKey(Mill, on_delete=models.CASCADE, related_name="licenses")
    license_no = models.CharField(max_length=50, unique=True, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    applied_date = models.DateField(auto_now_add=True)
    issued_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_licenses",
    )
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-applied_date"]

    def __str__(self):
        return f"License for {self.mill.mill_name} ({self.status})"


class MillingAllocation(models.Model):
    """
    A mill owner's request for a raw-paddy batch to be allocated from a PMB
    warehouse for milling: pending -> approved -> fulfilled (deducted from
    the chosen warehouse and added to the mill's MillStock), or pending ->
    rejected. Mirrors purchases.RiceRequest exactly, for the mill-owner
    actor instead of the authorized-purchaser actor. See
    OfficerMillingAllocationViewSet's approve/reject/fulfill actions.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        FULFILLED = "fulfilled", "Fulfilled"

    mill = models.ForeignKey(Mill, on_delete=models.CASCADE, related_name="milling_allocations")
    paddy_type = models.ForeignKey(
        "farmers.PaddyType", on_delete=models.PROTECT, related_name="milling_allocations"
    )
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_date = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_milling_allocations",
    )
    fulfilled_from_warehouse = models.ForeignKey(
        "farmers.Warehouse", on_delete=models.SET_NULL, null=True, blank=True, related_name="fulfilled_milling_allocations"
    )
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_date"]

    def __str__(self):
        return f"{self.quantity_kg}kg {self.paddy_type} for {self.mill} ({self.status})"


class MillStock(models.Model):
    """A mill's running raw-paddy inventory by type, mirroring purchases.PurchaserStock. Only ever changed by OfficerMillingAllocationViewSet.fulfill."""

    mill = models.ForeignKey(Mill, on_delete=models.CASCADE, related_name="stock_entries")
    paddy_type = models.ForeignKey(
        "farmers.PaddyType", on_delete=models.PROTECT, related_name="mill_stocks"
    )
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ("mill", "paddy_type")

    def __str__(self):
        return f"{self.mill} holds {self.quantity_kg}kg of {self.paddy_type}"


class MillingReport(models.Model):
    """A mill owner's periodic report of paddy processed and rice produced."""

    mill = models.ForeignKey(Mill, on_delete=models.CASCADE, related_name="milling_reports")
    # Optional links to the specific farmer harvest this report accounts
    # for and the paddy type it was milled from — a mill owner isn't
    # necessarily also a farmer, so most reports won't have a `harvest`.
    harvest = models.ForeignKey(
        "farmers.Harvest", on_delete=models.SET_NULL, null=True, blank=True, related_name="milling_reports"
    )
    paddy_type = models.ForeignKey(
        "farmers.PaddyType", on_delete=models.SET_NULL, null=True, blank=True, related_name="milling_reports"
    )
    report_date = models.DateField(auto_now_add=True)
    paddy_processed_kg = models.DecimalField(max_digits=12, decimal_places=2)
    rice_output_kg = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-report_date"]


class Inspection(models.Model):
    """
    An officer's on-site inspection visit to a mill: pass/fail/needs-
    follow-up, with notes. Purely a record of oversight — unlike License,
    an inspection doesn't gate the mill's operating status itself.
    """

    class Result(models.TextChoices):
        PASS = "pass", "Pass"
        FAIL = "fail", "Fail"
        NEEDS_FOLLOW_UP = "needs_follow_up", "Needs Follow-up"

    mill = models.ForeignKey(Mill, on_delete=models.CASCADE, related_name="inspections")
    officer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    inspection_date = models.DateField(auto_now_add=True)
    result = models.CharField(max_length=20, choices=Result.choices)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-inspection_date"]

    def __str__(self):
        return f"Inspection of {self.mill.mill_name} ({self.result})"


class MillingReturnRequest(models.Model):
    """
    A mill owner's request to transport milled rice (processed from a
    fulfilled MillingAllocation) back to a PMB warehouse: pending ->
    approved -> dispatched -> delivered, or pending -> rejected. Approval
    doesn't create the Delivery itself — an officer does that separately
    via the existing Transportation page, picking this request as the
    "linked request" (see farmers.Delivery.milling_return_request).
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        DISPATCHED = "dispatched", "Dispatched"
        DELIVERED = "delivered", "Delivered"

    mill = models.ForeignKey(Mill, on_delete=models.CASCADE, related_name="return_requests")
    allocation = models.ForeignKey(MillingAllocation, on_delete=models.PROTECT, related_name="return_requests")
    destination_warehouse = models.ForeignKey(
        "farmers.Warehouse", on_delete=models.PROTECT, related_name="incoming_milling_returns"
    )
    rice_kg = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_date = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_milling_returns",
    )
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_date"]

    def __str__(self):
        return f"{self.rice_kg}kg rice return for {self.mill} ({self.status})"
