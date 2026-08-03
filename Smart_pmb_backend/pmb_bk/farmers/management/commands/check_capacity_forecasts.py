# Runs farmers/forecasting.py's forecast_warehouse_capacity_risk for every
# warehouse, raising a predictive SystemAlert for any projected to fill up
# soon. This codebase has no task-queue/scheduler, so this is meant to be
# hooked into an external scheduler (cron, Windows Task Scheduler) rather
# than run automatically — see .env.example for a suggested cadence.
from django.core.management.base import BaseCommand

from farmers.forecasting import forecast_warehouse_capacity_risk
from farmers.models import Warehouse


class Command(BaseCommand):
    help = "Checks every warehouse's recent stock trend and raises a predictive capacity SystemAlert for any projected to fill up soon."

    def handle(self, *args, **options):
        checked = 0
        flagged = 0
        for warehouse in Warehouse.objects.all():
            checked += 1
            result = forecast_warehouse_capacity_risk(warehouse)
            if result is not None:
                flagged += 1
                self.stdout.write(
                    f"{result['warehouse']}: ~{result['days_until_90_pct']} day(s) until 90% capacity"
                )
        self.stdout.write(self.style.SUCCESS(f"Checked {checked} warehouse(s), flagged {flagged}."))
