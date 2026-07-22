import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Role, User
from farmers.models import District, Farmer, Harvest, PaddyType, Payment, Warehouse

PADDY_TYPES = [
    ("Nadu", "Long grain", Decimal("115.00")),
    ("Samba", "Short grain", Decimal("128.00")),
    ("Keeri Samba", "Premium short grain", Decimal("135.00")),
    ("Basmathi", "Aromatic long grain", Decimal("145.00")),
    ("Red Raw", "Unpolished red rice paddy", Decimal("108.00")),
    ("White Raw", "Standard white raw paddy", Decimal("110.00")),
]

WAREHOUSES = [
    ("Colombo Central Store", "WH-COL-01", "Colombo", Decimal("500000")),
    ("Kurunegala Regional Store", "WH-KUR-01", "Kurunegala", Decimal("350000")),
    ("Anuradhapura Collection Center", "WH-ANU-01", "Anuradhapura", Decimal("400000")),
    ("Galle Coastal Store", "WH-GAL-01", "Galle", Decimal("250000")),
    ("Polonnaruwa Storage Facility", "WH-POL-01", "Polonnaruwa", Decimal("300000")),
]

DEMO_FARMERS = [
    ("Nimal Perera", "912345678V", "Colombo"),
    ("Kamala Silva", "923456789V", "Kurunegala"),
    ("Sunil Fernando", "934567890V", "Anuradhapura"),
    ("Chamari Jayasuriya", "945678901V", "Galle"),
    ("Ruwan Bandara", "956789012V", "Polonnaruwa"),
    ("Malini Rathnayake", "967890123V", "Kandy"),
]


class Command(BaseCommand):
    help = (
        "Seeds demo warehouses, paddy types, farmers, and harvests (moved through the "
        "full pending/verified/collected/rejected workflow with matching payments) so the "
        "PMB officer dashboards, reports, and charts have realistic data to display."
    )

    def handle(self, *args, **options):
        with transaction.atomic():
            paddy_types = self._seed_paddy_types()
            warehouses = self._seed_warehouses()
            farmers = self._seed_farmers()
            created = self._seed_harvests(farmers, paddy_types, warehouses)
        self.stdout.write(self.style.SUCCESS(f"Officer demo data seeded ({created} harvests)."))

    def _seed_paddy_types(self):
        types = []
        for name, variety, price in PADDY_TYPES:
            pt, _ = PaddyType.objects.get_or_create(
                type_name=name,
                defaults={"variety": variety, "guaranteed_price": price, "is_active": True},
            )
            types.append(pt)
        return types

    def _seed_warehouses(self):
        warehouses = []
        for name, code, district_name, capacity in WAREHOUSES:
            district = District.objects.filter(name=district_name).first()
            wh, _ = Warehouse.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "capacity": capacity,
                    "district": district,
                    "province": district.province if district else None,
                    "status": Warehouse.Status.ACTIVE,
                    "contact_number": f"011{random.randint(1000000, 9999999)}",
                    "established_date": timezone.now().date()
                    - timedelta(days=random.randint(200, 1500)),
                },
            )
            warehouses.append(wh)
        return warehouses

    def _seed_farmers(self):
        farmer_role = Role.objects.get(slug="farmer")
        farmers = []
        for name, nic, district_name in DEMO_FARMERS:
            district = District.objects.filter(name=district_name).first()
            email = f"{name.lower().replace(' ', '.')}@smartpmb.local"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": name,
                    "role": farmer_role,
                    "email_confirmed": True,
                    "is_active": True,
                },
            )
            if created:
                user.set_password("Demo@1234")
                user.save(update_fields=["password"])
            farmer, _ = Farmer.objects.get_or_create(
                user=user,
                defaults={
                    "registration_no": f"FRM-{timezone.now().year}-{random.randint(100000, 999999)}",
                    "name": name,
                    "nic": nic,
                    "district": district,
                    "province": district.province if district else None,
                    "land_size": Decimal(random.randint(1, 10)),
                    "contact_number": f"07{random.randint(10000000, 99999999)}",
                    "status": Farmer.Status.ACTIVE,
                },
            )
            farmers.append(farmer)

        # Fold in any already-existing farmers too, so real accounts show up
        # in the seeded activity rather than only the demo ones.
        for f in Farmer.objects.exclude(id__in=[f.id for f in farmers]):
            farmers.append(f)
        return farmers

    def _seed_harvests(self, farmers, paddy_types, warehouses):
        if Harvest.objects.exists():
            self.stdout.write("Harvests already exist — skipping to avoid duplicating demo activity.")
            return 0

        today = timezone.now().date()
        created = 0
        # ~26 weeks (6 months) of purchasing activity, a few harvests a week,
        # so dashboard/report time-series charts have a real trend to show.
        for weeks_ago in range(26, -1, -1):
            harvest_date = today - timedelta(weeks=weeks_ago)
            for _ in range(random.randint(2, 4)):
                farmer = random.choice(farmers)
                paddy_type = random.choice(paddy_types)
                harvest = Harvest.objects.create(
                    farmer=farmer,
                    paddy_type=paddy_type,
                    quantity_kg=Decimal(random.randint(200, 2000)),
                )
                # harvest_date is auto_now_add, so it has to be backdated via
                # a queryset update (which bypasses the auto-now handling)
                # rather than passed to create().
                Harvest.objects.filter(pk=harvest.pk).update(harvest_date=harvest_date)
                harvest.refresh_from_db()
                created += 1

                # Weighted so most demo activity reads as a healthy, working
                # purchasing pipeline rather than a pile of untouched items.
                outcome = random.choices(
                    ["pending", "verified", "collected", "rejected"],
                    weights=[10, 15, 65, 10],
                )[0]
                if outcome == "pending":
                    continue
                if outcome == "rejected":
                    harvest.status = Harvest.Status.REJECTED
                    harvest.save(update_fields=["status"])
                    continue

                # verified/collected: replicate what OfficerHarvestViewSet's
                # approve() action does, so the data is internally consistent
                # with how the real workflow produces it.
                warehouse = random.choice(warehouses)
                unit_price = paddy_type.guaranteed_price + Decimal(random.choice([-2, -1, 0, 0, 1, 2]))
                harvest.warehouse = warehouse
                harvest.grade = random.choices(["A", "B", "C"], weights=[50, 35, 15])[0]
                harvest.moisture_level = Decimal(random.randint(12, 18))
                harvest.quality_check = True
                harvest.unit_price = unit_price
                harvest.purchase_date = harvest_date + timedelta(days=random.randint(1, 3))
                harvest.status = Harvest.Status.VERIFIED
                harvest.save()

                payment = Payment.objects.create(
                    harvest=harvest,
                    farmer=harvest.farmer,
                    amount=harvest.quantity_kg * harvest.unit_price,
                    status=Payment.Status.PENDING,
                    method=random.choice([Payment.Method.CASH, Payment.Method.BANK_TRANSFER]),
                )

                if outcome == "collected":
                    # Mirrors mark_collected(): complete the payment and add
                    # the quantity onto the warehouse's running stock.
                    harvest.status = Harvest.Status.COLLECTED
                    harvest.save(update_fields=["status"])
                    payment.status = Payment.Status.COMPLETED
                    payment.payment_date = harvest.purchase_date
                    payment.save(update_fields=["status", "payment_date"])
                    warehouse.current_stock = warehouse.current_stock + harvest.quantity_kg
                    warehouse.save(update_fields=["current_stock"])

        return created
