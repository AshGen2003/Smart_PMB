# Core domain models for the paddy-purchasing business: geography
# (Province/District), farmer profiles, warehouses, paddy types and their
# guaranteed prices, harvest submissions and their approval workflow, and
# the payments/notifications generated along the way.
from datetime import date

from django.conf import settings
from django.db import models


class Season(models.TextChoices):
    YALA = "yala", "Yala"
    MAHA = "maha", "Maha"


def season_for_date(d: date) -> str:
    """Sri Lanka's two paddy growing seasons: Yala (Apr-Aug), Maha (Sep-Mar, wraps year-end)."""
    return Season.YALA if 4 <= d.month <= 8 else Season.MAHA


def season_date_range(today: date) -> tuple[date, date]:
    """The concrete start/end dates of the season `today` falls within (Maha wraps across the year boundary)."""
    if season_for_date(today) == Season.YALA:
        return date(today.year, 4, 1), date(today.year, 8, 31)
    if today.month >= 9:
        return date(today.year, 9, 1), date(today.year + 1, 3, 31)
    return date(today.year - 1, 9, 1), date(today.year, 3, 31)


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
    bank_branch = models.CharField(max_length=100, blank=True)
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


class DeliverySlot(models.Model):
    """
    A farmer's advance booking of a future paddy delivery to a warehouse,
    verified on arrival by that warehouse's manager (see
    WarehouseManagerDeliverySlotLookupView/CheckInView). `booking_reference`
    uses a deliberately different format from Harvest.lot_code
    (BK-YYYYMMDD-XXXXXX vs PMB-000123-ABCDEF) so the two can never be
    confused when read off a QR/printed slip — this is a scheduling
    artifact, not a traceability one.
    """

    class Status(models.TextChoices):
        BOOKED = "booked", "Booked"
        ARRIVED = "arrived", "Arrived"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="delivery_slots")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name="delivery_slots")
    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.SET_NULL, null=True, blank=True, related_name="delivery_slots"
    )
    estimated_quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BOOKED)
    booking_reference = models.CharField(max_length=30, unique=True, db_index=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-scheduled_date", "-id"]

    def __str__(self):
        return f"{self.booking_reference} ({self.farmer}, {self.status})"


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

    # Real PMB paddy intake standard: moisture content must be at or below
    # this, and chaff/impurities strictly below this, or the lot fails
    # quality regardless of grade. See meets_pmb_quality_standard below.
    PMB_MAX_MOISTURE_PCT = 14
    PMB_MAX_IMPURITY_PCT = 9

    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="harvests")
    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.SET_NULL, null=True, blank=True, related_name="harvests"
    )
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    harvest_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    # Optional link to the DeliverySlot booking this harvest fulfilled, for
    # traceability. Doesn't affect officer-side assessment (grade/price/
    # warehouse), which stays officer-only regardless.
    delivery_slot = models.ForeignKey(
        DeliverySlot, on_delete=models.SET_NULL, null=True, blank=True, related_name="harvests"
    )

    # Officer-recorded fields — null/no-default means "not yet assessed",
    # distinct from an officer having actually recorded a pass/grade.
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name="harvests"
    )
    grade = models.CharField(max_length=1, choices=Grade.choices, null=True, blank=True)
    moisture_level = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    impurity_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    empty_grains_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    # Officer's own manual sign-off — a judgment call that can consider
    # things the numeric thresholds below don't (e.g. colour, borderline
    # cases). Distinct from meets_pmb_quality_standard, which is purely
    # derived from moisture_level/impurity_percent; keep both, don't merge.
    quality_check = models.BooleanField(null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)

    @property
    def meets_pmb_quality_standard(self):
        """Derived pass/fail against the real PMB intake standard. None means not yet assessed."""
        if self.moisture_level is None or self.impurity_percent is None:
            return None
        return (
            self.moisture_level <= self.PMB_MAX_MOISTURE_PCT
            and self.impurity_percent < self.PMB_MAX_IMPURITY_PCT
        )

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
    when an officer approves a harvest, and moved to processing when the
    harvest is marked collected -- "collected" means disbursement is now
    queued, not that the farmer has actually been paid yet. An officer
    marks it disbursed (recording a reference number) via
    OfficerPaymentViewSet.disburse, or failed via .mark_failed. Kept in a
    one-to-one-ish relationship with Harvest via `update_or_create` on
    `harvest` in views.py, so re-approving a harvest updates the existing
    Payment rather than creating a duplicate.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        DISBURSED = "disbursed", "Disbursed"
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
    disbursement_reference = models.CharField(max_length=50, blank=True)
    disbursed_date = models.DateField(null=True, blank=True)


class PriceRecord(models.Model):
    """
    Historical snapshot of a PaddyType's guaranteed price on a given date,
    tagged with the growing season it was set in (Yala/Maha). Written by
    PaddyTypeViewSet.perform_create/perform_update in views.py every time a
    guaranteed_price is set or changed; read via price_history().
    """

    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.CASCADE, related_name="price_records"
    )
    guaranteed_price = models.DecimalField(max_digits=10, decimal_places=2)
    season = models.CharField(max_length=10, choices=Season.choices, default=Season.YALA)
    effective_date = models.DateField(auto_now_add=True)


class TransactionLog(models.Model):
    """
    An audit trail entry for one stock movement at a warehouse — additive
    telemetry alongside (not a replacement for) `Warehouse.current_stock`
    and `Inventory`, which are the actual source of truth those movements
    update. Exactly one of `harvest`/`rice_request`/`transfer_request` is
    set, identifying which event caused the movement; see _log_transaction()
    in views.py, called from OfficerHarvestViewSet.mark_collected (farmers),
    OfficerRiceRequestViewSet.fulfill (purchases), and
    WarehouseTransferRequestViewSet.approve (farmers).
    """

    class TransactionType(models.TextChoices):
        HARVEST_COLLECTION = "harvest_collection", "Harvest Collection"
        RICE_REQUEST_FULFILLMENT = "rice_request_fulfillment", "Rice Request Fulfillment"
        MANUAL_ADJUSTMENT = "manual_adjustment", "Manual Adjustment"
        TRANSFER_OUT = "transfer_out", "Transfer Out"
        TRANSFER_IN = "transfer_in", "Transfer In"
        MILLING_ALLOCATION_FULFILLMENT = "milling_allocation_fulfillment", "Milling Allocation Fulfillment"
        DISPATCH_MANIFEST_DELIVERY = "dispatch_manifest_delivery", "Dispatch Manifest Delivery"
        MILLING_RETURN_DELIVERY = "milling_return_delivery", "Milling Return Delivery"

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
    transfer_request = models.ForeignKey(
        "WarehouseTransferRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="transaction_logs"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class WarehouseTransferRequest(models.Model):
    """
    A warehouse manager's request to move stock of a specific paddy type/
    grade from another warehouse into their own. Initiated by the manager
    of `to_warehouse` (never on behalf of another warehouse — see
    WarehouseManagerTransferRequestViewSet.perform_create in views.py,
    which forces `to_warehouse` to the requesting manager's own warehouse),
    approved/rejected by a PMB officer with "manage_warehouses". Approval
    moves the stock atomically and is a one-step action — unlike
    purchases.RiceRequest, both warehouses are already fixed at request
    time, so there's no separate "fulfill" step.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    from_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.PROTECT, related_name="outgoing_transfer_requests"
    )
    to_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.PROTECT, related_name="incoming_transfer_requests"
    )
    paddy_type = models.ForeignKey(
        PaddyType, on_delete=models.PROTECT, related_name="warehouse_transfer_requests"
    )
    grade = models.CharField(max_length=1, choices=Harvest.Grade.choices, null=True, blank=True)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    review_notes = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    requested_date = models.DateTimeField(auto_now_add=True)
    resolved_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-requested_date"]

    def __str__(self):
        return f"{self.quantity_kg}kg {self.paddy_type} from {self.from_warehouse} to {self.to_warehouse} ({self.status})"


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
    # The warehouse a delivery on this route should credit stock to on
    # arrival — set once per route so a new Delivery's own `warehouse` field
    # can be auto-filled from it (see DeliveryFormModal on the frontend),
    # instead of the officer re-picking the same warehouse every time.
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name="routes"
    )

    class Meta:
        ordering = ["origin", "destination"]

    def __str__(self):
        return f"{self.origin} → {self.destination}"


class Delivery(models.Model):
    """
    A scheduled or in-progress transport job. `warehouse` is the
    **destination** warehouse when `dispatch_manifest` or
    `milling_return_request` is set (a purchaser's or mill owner's approved
    request to transport goods TO a warehouse) -- but the **origin**
    warehouse in every other case: the original harvest-collection case
    (none of the four linked-request fields set), a `rice_request` (an
    officer sending a purchaser's fulfilled rice out of the warehouse), or a
    `milling_allocation` (an officer sending a mill's fulfilled raw-paddy
    allocation out of the warehouse) -- both of those already moved stock at
    fulfillment time (see purchases.OfficerRiceRequestViewSet.fulfill /
    mills.OfficerMillingAllocationViewSet.fulfill), so linking a Delivery to
    either is purely for tracking the physical transport, not stock
    accounting. At most one of `dispatch_manifest`/`milling_return_request`/
    `rice_request`/`milling_allocation` is ever set on a given Delivery.
    """

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
    # Optional links to the purchaser/mill-owner request this delivery
    # fulfills -- see this model's docstring for how they flip `warehouse`'s
    # meaning from origin to destination. Set via the officer's
    # "linked request" picker in DeliveryFormModal at creation time.
    dispatch_manifest = models.ForeignKey(
        "purchases.DispatchManifest", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    milling_return_request = models.ForeignKey(
        "mills.MillingReturnRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    rice_request = models.ForeignKey(
        "purchases.RiceRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    milling_allocation = models.ForeignKey(
        "mills.MillingAllocation", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    scheduled_date = models.DateField()
    # Nullable so existing rows (created before this field existed) don't
    # break — new deliveries are required to set it at the serializer/form
    # level so the reminder job below has a real trip-start time to count
    # back from.
    scheduled_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    # Set by send_delivery_reminders (see the management command) once the
    # "driver hasn't accepted and the trip starts within 3 hours" reminder
    # has fired for this delivery, so the periodic job never sends it twice.
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    # Set when this delivery is carrying a purchaser's dispatch manifest or
    # a mill's finished-rice return back into PMB custody, rather than a
    # plain warehouse-to-warehouse transfer — an officer links one of these
    # manually from Transportation after approving the manifest/return (no
    # Delivery is auto-created on approval). When this delivery reaches
    # "delivered", _handle_delivery_delivered below credits the destination
    # warehouse's stock and flips the linked manifest/return to DELIVERED.
    dispatch_manifest = models.ForeignKey(
        "purchases.DispatchManifest", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    milling_return_request = models.ForeignKey(
        "mills.MillingReturnRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )

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
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_records")
    service_date = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    next_service_date = models.DateField(null=True, blank=True)
    # A driver logs a maintenance record (see DriverMaintenanceRecordViewSet)
    # and a PMB officer reviews the cost (see MaintenanceRecordViewSet's
    # approve/reject actions) -- mirrors LicenseApplication's review shape.
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-service_date", "-id"]
