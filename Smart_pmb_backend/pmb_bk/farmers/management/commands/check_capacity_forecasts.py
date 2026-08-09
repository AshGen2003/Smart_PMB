# Runs farmers/forecasting.py's forecast_warehouse_capacity_risk (predictive
# over-capacity) and sysops.utils.raise_low_stock_alert (a direct
# under-10%-capacity check, no trend needed) for every warehouse. Both are
# state checks rather than event-driven — unlike the reactive
# high-capacity/low-stock alerts, which only fire at the moment a stock
# change crosses their threshold, this catches a warehouse that was already
# past a threshold before anything changed (e.g. right after this alert was
# first deployed). This codebase has no in-process task queue/scheduler, so
# in production this is invoked once a day by
# .github/workflows/capacity-forecast-schedule.yml, which calls
# sysops.views.RunCapacityForecastsView (POST /api/internal/run-capacity-forecasts/)
# rather than reaching into the server directly. You can still run it by
# hand locally: `python manage.py check_capacity_forecasts`.
from django.core.management.base import BaseCommand

from farmers.forecasting import forecast_warehouse_capacity_risk
from farmers.models import Warehouse
from sysops.models import SystemAlert
from sysops.utils import raise_low_stock_alert


class Command(BaseCommand):
    help = "Checks every warehouse's stock level, raising a predictive over-capacity SystemAlert for any projected to fill up soon, and a low-stock SystemAlert for any currently under 10% capacity."

    def handle(self, *args, **options):
        checked = 0
        flagged_high = 0
        flagged_low = 0
        for warehouse in Warehouse.objects.all():
            checked += 1
            result = forecast_warehouse_capacity_risk(warehouse)
            if result is not None:
                flagged_high += 1
                self.stdout.write(
                    f"{result['warehouse']}: ~{result['days_until_90_pct']} day(s) until 90% capacity"
                )
            before = SystemAlert.objects.filter(
                alert_type=f"low_stock_warehouse_{warehouse.id}", status=SystemAlert.Status.OPEN
            ).exists()
            raise_low_stock_alert(warehouse, warehouse.current_stock)
            if not before and SystemAlert.objects.filter(
                alert_type=f"low_stock_warehouse_{warehouse.id}", status=SystemAlert.Status.OPEN
            ).exists():
                flagged_low += 1
                self.stdout.write(f"{warehouse.name}: below 10% capacity")
        self.stdout.write(
            self.style.SUCCESS(
                f"Checked {checked} warehouse(s), flagged {flagged_high} over-capacity risk, "
                f"{flagged_low} low-stock."
            )
        )
