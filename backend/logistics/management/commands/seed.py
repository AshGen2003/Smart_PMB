"""Seed command: creates a demo user/token and sample logistics data.

Usage:
    python manage.py seed            # create user + data (idempotent-ish)
    python manage.py seed --reset    # wipe logistics tables first
"""
import datetime

from django.utils import timezone
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token

from logistics.models import (
    Delivery,
    Driver,
    FuelRecord,
    GpsTracking,
    MaintenanceRecord,
    Route,
    Vehicle,
)


class Command(BaseCommand):
    help = "Seed demo logistics data and an API user."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing logistics data first.")

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Resetting logistics data...")
            GpsTracking.objects.all().delete()
            Delivery.objects.all().delete()
            FuelRecord.objects.all().delete()
            MaintenanceRecord.objects.all().delete()
            Route.objects.all().delete()
            Driver.objects.all().delete()
            Vehicle.objects.all().delete()

        # --- Application logins (admin + regular user) -----------------------
        self.stdout.write(self.style.WARNING("Application logins:"))
        accounts = [
            ("admin", "Admin@1234", True, True, "admin@smartpmb.lk"),
            ("user", "User@1234", False, False, "user@smartpmb.lk"),
        ]
        for username, password, is_staff, is_superuser, email in accounts:
            u, created = User.objects.get_or_create(
                username=username,
                defaults={"is_staff": is_staff, "is_superuser": is_superuser, "email": email},
            )
            if created:
                u.set_password(password)
                u.save()
            token, _ = Token.objects.get_or_create(user=u)
            self.stdout.write(
                self.style.SUCCESS(f"  - {username:8s} / {password}   (token: {token.key})")
            )

        # --- Vehicles ---------------------------------------------------------
        vehicles = []
        for reg, vtype, cap in [
            ("WP-Q-1234", "lorry", 10000),
            ("WP-Q-2345", "van", 2500),
            ("WP-T-3456", "three_wheeler", 800),
            ("CP-L-4567", "lorry", 12000),
            ("EP-V-5678", "pickup", 1500),
        ]:
            v, _ = Vehicle.objects.get_or_create(
                registration_no=reg, defaults={"vehicle_type": vtype, "capacity": cap, "status": "active"}
            )
            vehicles.append(v)

        # --- Drivers ----------------------------------------------------------
        drivers = []
        for name, lic in [
            ("Kamal Perera", "B1234567"),
            ("Nimal Fernando", "B2345678"),
            ("Sunil Rajapaksa", "B3456789"),
            ("Duminda Silva", "B4567890"),
        ]:
            d, _ = Driver.objects.get_or_create(
                license_no=lic, defaults={"name": name, "contact_no": "07" + str(len(lic)) + "000000", "status": "available"}
            )
            drivers.append(d)

        # --- Routes -----------------------------------------------------------
        routes = []
        for origin, dest, dist, eta in [
            ("Kurunegala", "Colombo", 94.0, "2h 30m"),
            ("Anuradhapura", "Kurunegala", 87.0, "2h 10m"),
            ("Matara", "Colombo", 150.0, "3h 40m"),
            ("Batticaloa", "Colombo", 330.0, "7h 20m"),
        ]:
            r, _ = Route.objects.get_or_create(
                origin=origin, destination=dest,
                defaults={"distance": dist, "estimated_time": eta},
            )
            routes.append(r)

        # --- Deliveries -------------------------------------------------------
        today = datetime.date.today()
        deliveries = []
        for i, (v, d, r) in enumerate(zip(vehicles, drivers, routes)):
            dl, _ = Delivery.objects.get_or_create(
                vehicle=v, driver=d, route=r,
                defaults={
                    "scheduled_date": today - datetime.timedelta(days=i),
                    "delivery_status": ["scheduled", "in_transit", "delivered", "delivered", "delayed"][i % 5],
                },
            )
            deliveries.append(dl)

        # --- Fuel + maintenance ----------------------------------------------
        for v in vehicles[:3]:
            FuelRecord.objects.get_or_create(
                vehicle=v, fuel_date=today - datetime.timedelta(days=2),
                defaults={"fuel_type": "diesel", "quantity": 120.0, "cost": 38000.0},
            )
            MaintenanceRecord.objects.get_or_create(
                vehicle=v, service_date=today - datetime.timedelta(days=20),
                defaults={"description": " routine service", "cost": 15000.0,
                          "next_service_date": today + datetime.timedelta(days=150)},
            )

        # --- GPS points for first in-transit delivery ------------------------
        if deliveries:
            GpsTracking.objects.get_or_create(
                delivery=deliveries[1],
                defaults={"latitude": 7.8731, "longitude": 80.7718,
                          "timestamp": timezone.now()},
            )

        self.stdout.write(self.style.SUCCESS("Seed complete."))
