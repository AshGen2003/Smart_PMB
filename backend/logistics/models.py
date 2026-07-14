"""Models for the Smart PMB Logistics Module.

Logistics entities (managed by Django migrations):
    Vehicle, Driver, Route, Delivery, FuelRecord, MaintenanceRecord, GpsTracking

Cross-module reference entities (unmanaged — they live in the shared Supabase
schema and are owned by other Smart PMB modules):
    Warehouse, PmbOfficer, PurchaseIntake

Foreign keys to unmanaged models use ``db_constraint=False`` so that Django
never tries to create or enforce constraints on tables it does not own.
"""
from django.db import models


# ---------------------------------------------------------------------------
# Cross-module reference models (unmanaged)
# ---------------------------------------------------------------------------
class Warehouse(models.Model):
    warehouse_id = models.AutoField(primary_key=True, db_column="warehouse_id")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, blank=True, default="")
    capacity = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    current_stock = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, default="")
    district = models.CharField(max_length=100, blank=True, default="")
    province = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=50, blank=True, default="")
    contact_number = models.CharField(max_length=50, blank=True, default="")
    established_date = models.DateField(null=True, blank=True)
    managed_by_pmb_officer_id = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "warehouse"


class PmbOfficer(models.Model):
    pmb_officer_id = models.AutoField(primary_key=True, db_column="pmb_officer_id")
    employee_no = models.CharField(max_length=50, blank=True, default="")
    name = models.CharField(max_length=150)
    nic = models.CharField(max_length=20, blank=True, default="")
    role = models.CharField(max_length=50, blank=True, default="")
    designation = models.CharField(max_length=100, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    district = models.CharField(max_length=100, blank=True, default="")
    contact_number = models.CharField(max_length=50, blank=True, default="")
    email = models.CharField(max_length=150, blank=True, default="")
    joined_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        managed = False
        db_table = "pmb_officer"


class PurchaseIntake(models.Model):
    purchase_id = models.AutoField(primary_key=True, db_column="purchase_id")
    purchase_number = models.CharField(max_length=50, blank=True, default="")
    purchase_date = models.DateTimeField(null=True, blank=True)
    paddy_type = models.CharField(max_length=100, blank=True, default="")
    grade = models.CharField(max_length=50, blank=True, default="")
    quantity = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_price = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(max_length=50, blank=True, default="")
    payment_status = models.CharField(max_length=50, blank=True, default="")
    moisture_level = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    quality_checked = models.BooleanField(null=True, blank=True)
    farmer_id = models.IntegerField(null=True, blank=True)
    purchaser_id = models.IntegerField(null=True, blank=True)
    warehouse_id = models.IntegerField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "purchase_intake"


# ---------------------------------------------------------------------------
# Logistics entities (managed)
# ---------------------------------------------------------------------------
class Vehicle(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ("lorry", "Lorry"),
        ("van", "Van"),
        ("tractor", "Tractor"),
        ("three_wheeler", "Three Wheeler"),
        ("pickup", "Pickup"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("maintenance", "Under Maintenance"),
        ("retired", "Retired"),
    ]

    vehicle_id = models.AutoField(primary_key=True, db_column="vehicle_id")
    registration_no = models.CharField(max_length=30, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default="lorry")
    capacity = models.IntegerField(help_text="Carrying capacity in kilograms (kg)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    class Meta:
        db_table = "vehicle"
        ordering = ["vehicle_id"]

    def __str__(self):
        return f"{self.registration_no} ({self.get_vehicle_type_display()})"


class Driver(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("on_duty", "On Duty"),
        ("off_duty", "Off Duty"),
        ("inactive", "Inactive"),
    ]

    driver_id = models.AutoField(primary_key=True, db_column="driver_id")
    name = models.CharField(max_length=150)
    license_no = models.CharField(max_length=30, unique=True)
    contact_no = models.CharField(max_length=30, blank=True, default="")
    address = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")

    class Meta:
        db_table = "driver"
        ordering = ["driver_id"]

    def __str__(self):
        return f"{self.name} — {self.license_no}"


class Route(models.Model):
    route_id = models.AutoField(primary_key=True, db_column="route_id")
    origin = models.CharField(max_length=200)
    destination = models.CharField(max_length=200)
    distance = models.FloatField(help_text="Distance in kilometres")
    estimated_time = models.CharField(max_length=50, blank=True, default="", help_text="Estimated travel time (e.g. 3h 20m)")

    class Meta:
        db_table = "route"
        ordering = ["route_id"]

    def __str__(self):
        return f"{self.origin} → {self.destination}"


class Delivery(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("in_transit", "In Transit"),
        ("delivered", "Delivered"),
        ("delayed", "Delayed"),
        ("cancelled", "Cancelled"),
    ]

    delivery_id = models.AutoField(primary_key=True, db_column="delivery_id")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="deliveries")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="deliveries")
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name="deliveries")
    purchase = models.ForeignKey(
        PurchaseIntake, null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="+",
    )
    warehouse = models.ForeignKey(
        Warehouse, null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="+",
    )
    approved_by = models.ForeignKey(
        PmbOfficer, null=True, blank=True, on_delete=models.SET_NULL,
        db_constraint=False, related_name="+",
    )
    scheduled_date = models.DateField(null=True, blank=True)
    delivery_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")

    class Meta:
        db_table = "delivery"
        ordering = ["-scheduled_date", "delivery_id"]

    def __str__(self):
        return f"Delivery #{self.delivery_id} — {self.get_delivery_status_display()}"


class FuelRecord(models.Model):
    FUEL_TYPE_CHOICES = [
        ("petrol", "Petrol"),
        ("diesel", "Diesel"),
        ("cng", "CNG"),
    ]

    fuel_id = models.AutoField(primary_key=True, db_column="fuel_id")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_records")
    fuel_type = models.CharField(max_length=20, choices=FUEL_TYPE_CHOICES, default="diesel")
    quantity = models.FloatField(help_text="Quantity in litres")
    cost = models.FloatField(help_text="Total cost in LKR")
    fuel_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "fuel_record"
        ordering = ["-fuel_date", "fuel_id"]

    def __str__(self):
        return f"Fuel {self.get_fuel_type_display()} — {self.vehicle.registration_no}"


class MaintenanceRecord(models.Model):
    maintenance_id = models.AutoField(primary_key=True, db_column="maintenance_id")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_records")
    service_date = models.DateField(null=True, blank=True)
    description = models.CharField(max_length=255, blank=True, default="")
    cost = models.FloatField(default=0, help_text="Service cost in LKR")
    next_service_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "maintenance_record"
        ordering = ["-service_date", "maintenance_id"]

    def __str__(self):
        return f"Maintenance #{self.maintenance_id} — {self.vehicle.registration_no}"


class GpsTracking(models.Model):
    tracking_id = models.AutoField(primary_key=True, db_column="tracking_id")
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name="gps_points")
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "gps_tracking"
        ordering = ["-timestamp", "tracking_id"]

    def __str__(self):
        return f"GPS #{self.tracking_id} @ ({self.latitude}, {self.longitude})"
