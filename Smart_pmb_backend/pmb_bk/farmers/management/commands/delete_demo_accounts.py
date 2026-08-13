from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from accounts.models import User
from farmers.models import Delivery, DeliverySlot, Farmer, Harvest, Notification, Payment
from mills.models import MillingReturnRequest
from purchases.models import FarmGatePurchase

# Matches the email convention seed_officer_demo_data.py uses when creating
# the DEMO_FARMERS list (firstname.lastname@smartpmb.local) — no real
# account can have this domain, so it's a safe, precise identifier without
# needing a dedicated "is_demo" flag on the model.
DEMO_EMAIL_SUFFIX = "@smartpmb.local"


class Command(BaseCommand):
    help = (
        "Deletes every demo account (any role) identified by an "
        "@smartpmb.local email — this covers seed_officer_demo_data's "
        "farmers plus any manually-created demo driver/purchaser/mill-owner "
        "accounts using the same convention. Cascades through everything "
        "Django's FKs reach automatically (Farmer profile, Harvests, "
        "Payments, DeliverySlots, Notifications, sent/received "
        "accounts.Message rows), and additionally deletes any Delivery rows "
        "assigned to a demo driver first — Delivery.driver is PROTECT, so "
        "those would otherwise abort the whole deletion. Also clears any "
        "FarmGatePurchase (purchaser/farmer PROTECT) and MillingReturnRequest "
        "(blocks its Mill's MillingAllocation via PROTECT) rows tied to a "
        "demo account for the same reason. Shared reference data seeded "
        "alongside the farmers (Warehouses, PaddyTypes) is left untouched "
        "since real accounts may also depend on it. Dry-run by default — "
        "pass --confirm to actually delete."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Actually delete. Without this flag, only a summary is printed.",
        )

    def handle(self, *args, **options):
        demo_users = User.objects.filter(email__iendswith=DEMO_EMAIL_SUFFIX)
        count = demo_users.count()
        if count == 0:
            self.stdout.write(self.style.WARNING("No demo accounts found (nothing to do)."))
            return

        farmer_ids = list(
            Farmer.objects.filter(user__in=demo_users).values_list("id", flat=True)
        )
        harvest_count = Harvest.objects.filter(farmer_id__in=farmer_ids).count()
        payment_count = Payment.objects.filter(farmer_id__in=farmer_ids).count()
        slot_count = DeliverySlot.objects.filter(farmer_id__in=farmer_ids).count()
        notif_count = Notification.objects.filter(farmer_id__in=farmer_ids).count()
        driver_deliveries = Delivery.objects.filter(driver__in=demo_users)
        delivery_count = driver_deliveries.count()
        farm_gate_purchases = FarmGatePurchase.objects.filter(
            Q(purchaser__in=demo_users) | Q(farmer_id__in=farmer_ids)
        )
        fgp_count = farm_gate_purchases.count()
        milling_returns = MillingReturnRequest.objects.filter(mill__user__in=demo_users)
        milling_return_count = milling_returns.count()

        self.stdout.write(f"Demo accounts found: {count}")
        for u in demo_users:
            self.stdout.write(f"  - {u.email} ({u.full_name})")
        self.stdout.write(
            f"Will cascade-delete: {len(farmer_ids)} farmer profile(s), "
            f"{harvest_count} harvest(s), {payment_count} payment(s), "
            f"{slot_count} delivery slot(s), {notif_count} notification(s), "
            f"{delivery_count} delivery(ies) assigned to a demo driver "
            f"(plus their GPS location pings), {fgp_count} farm-gate "
            f"purchase(s), {milling_return_count} milling return request(s), "
            "and any messages sent/received by these accounts."
        )

        if not options["confirm"]:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run only — nothing deleted. Re-run with --confirm to actually delete."
                )
            )
            return

        with transaction.atomic():
            # These all sit behind a PROTECT FK somewhere in their chain, so
            # they must go first or the User delete below raises
            # ProtectedError and aborts the entire transaction.
            driver_deliveries.delete()
            farm_gate_purchases.delete()
            milling_returns.delete()
            demo_users.delete()

        self.stdout.write(
            self.style.SUCCESS(f"Deleted {count} demo account(s) and everything cascaded from them.")
        )
