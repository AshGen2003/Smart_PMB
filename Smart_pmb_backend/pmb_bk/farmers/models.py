# Core domain models for the paddy-purchasing business: geography
# (Province/District), farmer profiles, warehouses, paddy types and their
# guaranteed prices, harvest submissions and their approval workflow, and
# the payments/notifications generated along the way.
from django.conf import settings
from django.db import models


class Province(models.Model):
    """A top-level administrative region (e.g. "Western"), used to group Districts."""

    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(models.Model):
    """A district within a Province; Farmers and Warehouses are located in one."""

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
    """
    A registered farmer's profile: the paddy-purchasing-domain data linked
    one-to-one to a User account with role "farmer" (created together by
    RegisterFarmerSerializer in accounts/serializers.py).
    """

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
    # User-controlled preference (Settings → Notifications): whether a
    # harvest of theirs being approved/rejected/collected creates a
    # dashboard notification (see farmers/views.py's _notify_farmer).
    notify_harvest_updates = models.BooleanField(default=True)
    # User-controlled preference (Settings → Notifications): whether a
    # harvest status change also sends an SMS to contact_number, via
    # accounts/sms.py's send_sms — see farmers/views.py's _notify_farmer.
    # Opt-in default-off since SMS costs money per message, unlike the
    # free in-app notification notify_harvest_updates already gates.
    notify_via_sms = models.BooleanField(default=False)
    # Recalculated by farmers/scoring.py's recalculate_reliability_score
    # whenever one of this farmer's harvests changes status (see
    # OfficerHarvestViewSet.approve/reject/mark_collected) — 0-100, blends
    # delivery consistency (collected vs rejected) and average grade over
    # the trailing 12 months.
    reliability_score = models.FloatField(default=0)

    def __str__(self):
        return f"{self.name} ({self.registration_no})"


class PaddyType(models.Model):
    """A variety of paddy the board purchases (e.g. "Nadu"), with its currently guaranteed price per kg."""

    type_name = models.CharField(max_length=100, unique=True)
    variety = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    guaranteed_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["type_name"]

    def __str__(self):
        return self.type_name


class Warehouse(models.Model):
    """
    A storage facility that receives collected paddy. `current_stock` is
    incremented whenever a Harvest is marked collected (see
    OfficerHarvestViewSet.mark_collected in views.py).
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        FULL = "full", "Full"
        UNDER_MAINTENANCE = "under_maintenance", "Under Maintenance"

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    capacity = models.DecimalField(max_digits=12, decimal_places=2)
    current_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    contact_number = models.CharField(max_length=20, blank=True)
    established_date = models.DateField(null=True, blank=True)
    district = models.ForeignKey(
        District, on_delete=models.SET_NULL, null=True, blank=True, related_name="warehouses"
    )
    province = models.ForeignKey(
        Province, on_delete=models.SET_NULL, null=True, blank=True, related_name="warehouses"
    )
    location = models.CharField(max_length=255, blank=True)
    managed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_warehouses",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Harvest(models.Model):
    """
    A farmer's paddy harvest submission and its progress through the
    purchasing workflow:
      pending -> verified (an officer records grade/moisture/price and
      approves it, which also creates a pending Payment) -> collected (an
      officer confirms physical collection, which completes the Payment
      and adds the quantity to the warehouse's stock); or pending ->
      rejected. See OfficerHarvestViewSet's approve/reject/mark_collected
      actions in views.py for the actual transitions.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        COLLECTED = "collected", "Collected"
        REJECTED = "rejected", "Rejected"

    class Grade(models.TextChoices):
        A = "A", "Grade A"
        B = "B", "Grade B"
        C = "C", "Grade C"

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="harvests")
    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.SET_NULL, null=True, blank=True, related_name="harvests"
    )
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    harvest_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Officer-recorded fields — null/no-default means "not yet assessed",
    # distinct from an officer having actually recorded a pass/grade.
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name="harvests"
    )
    grade = models.CharField(max_length=1, choices=Grade.choices, null=True, blank=True)
    moisture_level = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    quality_check = models.BooleanField(null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)

    # Which officer/admin last ran approve/reject/collect on this harvest —
    # set in OfficerHarvestViewSet's action methods, never writable directly.
    # `related_name="+"` mirrors Delivery.approved_by: no reverse accessor
    # needed (nobody queries "harvests processed by this user" today).
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    # Generated once, in OfficerHarvestViewSet.mark_collected, the moment a
    # harvest becomes a real warehouse-tracked lot — public/trace/<lot_code>
    # and its QR code (see farmers/views.py's public trace views) let anyone
    # verify this lot's farm-to-warehouse journey without logging in.
    lot_code = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-harvest_date"]


class Payment(models.Model):
    """
    The amount owed to a farmer for a specific Harvest. Created (pending)
    when an officer approves a harvest, and completed when the harvest is
    marked collected. Kept in a one-to-one-ish relationship with Harvest
    via `update_or_create` on `harvest` in views.py, so re-approving a
    harvest updates the existing Payment rather than creating a duplicate.
    """

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
    """Historical snapshot of a PaddyType's guaranteed price on a given date (currently not written to by any view)."""

    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.CASCADE, related_name="price_records"
    )
    guaranteed_price = models.DecimalField(max_digits=10, decimal_places=2)
    effective_date = models.DateField(auto_now_add=True)


class TransactionLog(models.Model):
    """
    An audit trail entry for one stock movement at a warehouse — additive
    telemetry alongside (not a replacement for) `Warehouse.current_stock`
    and `Inventory`, which are the actual source of truth those movements
    update. Exactly one of `harvest`/`rice_request` is set, identifying
    which event caused the movement; see _log_transaction() in views.py,
    called from OfficerHarvestViewSet.mark_collected (farmers) and
    OfficerRiceRequestViewSet.fulfill (purchases).
    """

    class TransactionType(models.TextChoices):
        HARVEST_COLLECTION = "harvest_collection", "Harvest Collection"
        RICE_REQUEST_FULFILLMENT = "rice_request_fulfillment", "Rice Request Fulfillment"
        MANUAL_ADJUSTMENT = "manual_adjustment", "Manual Adjustment"

    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="transaction_logs")
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    # Signed: positive for stock arriving (harvest collection), negative
    # for stock leaving (rice request fulfillment).
    quantity_change = models.DecimalField(max_digits=12, decimal_places=2)
    harvest = models.ForeignKey(
        Harvest, on_delete=models.SET_NULL, null=True, blank=True, related_name="transaction_logs"
    )
    rice_request = models.ForeignKey(
        "purchases.RiceRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="transaction_logs"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Inventory(models.Model):
    """
    Per-warehouse, per-paddy-type, per-grade stock breakdown — the detailed
    counterpart to `Warehouse.current_stock`'s single aggregate number.
    Maintained by the same two write paths as TransactionLog above (see
    _log_transaction() in views.py); `grade` is nullable since rice
    requests fulfilled from a warehouse aren't necessarily tied to a
    specific harvest grade.
    """

    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name="inventory_lines")
    paddy_type = models.ForeignKey(PaddyType, on_delete=models.CASCADE, related_name="inventory_lines")
    grade = models.CharField(max_length=1, choices=Harvest.Grade.choices, null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=10, default="kg")
    minimum_level = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    maximum_level = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        unique_together = ("warehouse", "paddy_type", "grade")
        ordering = ["warehouse__name", "paddy_type__type_name"]

    def __str__(self):
        return f"{self.warehouse.name}: {self.quantity}{self.unit} {self.paddy_type.type_name} (Grade {self.grade or '—'})"


class TransactionVerification(models.Model):
    """
    An officer's after-the-fact sign-off on a completed transaction —
    exactly one of `harvest` (a collected Harvest) or `rice_request` (a
    fulfilled RiceRequest) is set. This is an additional accountability
    layer, not a new blocking gate: it doesn't change the Harvest/
    RiceRequest status machine, it just records that someone double-checked
    a transaction after the fact. See _log_transaction()'s docstring above
    for the same dual-nullable-FK shape used by TransactionLog.
    """

    class Status(models.TextChoices):
        VERIFIED = "verified", "Verified"
        FLAGGED = "flagged", "Flagged"

    harvest = models.ForeignKey(
        Harvest, on_delete=models.CASCADE, null=True, blank=True, related_name="verifications"
    )
    rice_request = models.ForeignKey(
        "purchases.RiceRequest", on_delete=models.CASCADE, null=True, blank=True, related_name="verifications"
    )
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    verified_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.VERIFIED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-verified_at"]

    def __str__(self):
        target = self.harvest_id and f"Harvest #{self.harvest_id}" or f"RiceRequest #{self.rice_request_id}"
        return f"Verification of {target} ({self.status})"


class Notification(models.Model):
    """An in-app message shown to a farmer on their dashboard (e.g. harvest status updates), markable as read."""

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-sent_at"]


# ---------------------------------------------------------------------------
# Transportation: the PMB Officer's vehicle fleet, drivers, routes, and
# deliveries of collected paddy between warehouses. Drivers are real User
# accounts (role "driver") rather than a standalone roster — see Delivery
# below — so they show up in admin User Management like any other account.
# ---------------------------------------------------------------------------
class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        LORRY = "lorry", "Lorry"
        VAN = "van", "Van"
        TRACTOR = "tractor", "Tractor"
        THREE_WHEELER = "three_wheeler", "Three Wheeler"
        PICKUP = "pickup", "Pickup"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        MAINTENANCE = "maintenance", "Under Maintenance"
        RETIRED = "retired", "Retired"

    registration_no = models.CharField(max_length=30, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.LORRY)
    model = models.CharField(max_length=100, blank=True)
    manufacture_year = models.PositiveIntegerField(null=True, blank=True)
    size = models.CharField(max_length=50, blank=True, help_text="Body size/dimensions, e.g. \"14ft\", \"6-wheeler\".")
    capacity_kg = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["registration_no"]

    def __str__(self):
        return self.registration_no


class Route(models.Model):
    origin = models.CharField(max_length=200)
    destination = models.CharField(max_length=200)
    distance_km = models.DecimalField(max_digits=8, decimal_places=2)
    estimated_time = models.CharField(max_length=50, blank=True, help_text="e.g. 3h 20m")

    class Meta:
        ordering = ["origin", "destination"]

    def __str__(self):
        return f"{self.origin} → {self.destination}"


class Delivery(models.Model):
    """A scheduled or in-progress transport of collected paddy from a warehouse along a route."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_TRANSIT = "in_transit", "In Transit"
        DELIVERED = "delivered", "Delivered"
        DELAYED = "delayed", "Delayed"
        CANCELLED = "cancelled", "Cancelled"

    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="deliveries")
    # A User with the "driver" role — not a dedicated Driver model, since
    # drivers now log in like any other staff account (see accounts app).
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    route = models.ForeignKey(Route, on_delete=models.PROTECT, related_name="deliveries")
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)

    class AssignmentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    # Whether the assigned driver has responded to this task yet. Separate
    # from `status` above (which tracks the delivery's physical progress)
    # — a delivery only starts moving through scheduled/in_transit/etc.
    # once the driver has accepted it. Reset to PENDING (see
    # DeliveryViewSet.perform_update) whenever the driver is reassigned.
    assignment_status = models.CharField(
        max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.PENDING
    )

    class Meta:
        ordering = ["-scheduled_date", "-id"]

    def __str__(self):
        return f"Delivery #{self.pk} ({self.status})"


class DeliveryLocationPing(models.Model):
    """
    A single GPS reading reported by the driver's browser while a delivery
    is in transit (see DriverLocationPingView) — the trail of pings for a
    delivery lets the officer/driver dashboards show its live position on
    a map. Only the most recent ping is currently displayed (see
    DeliverySerializer.get_latest_location), but the full trail is kept in
    case a route-replay view is wanted later.
    """

    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name="location_pings")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]


class FuelRecord(models.Model):
    class FuelType(models.TextChoices):
        PETROL = "petrol", "Petrol"
        DIESEL = "diesel", "Diesel"
        CNG = "cng", "CNG"

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_records")
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, default=FuelType.DIESEL)
    quantity_litres = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    fuel_date = models.DateField()

    class Meta:
        ordering = ["-fuel_date", "-id"]


class MaintenanceRecord(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_records")
    service_date = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    next_service_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-service_date", "-id"]
