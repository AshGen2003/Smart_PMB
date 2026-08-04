# Runs farmers/forecasting.py's forecast_warehouse_capacity_risk for every
# warehouse, raising a predictive SystemAlert for any projected to fill up
# soon. This codebase has no in-process task queue/scheduler, so in
# production this is invoked once a day by
# .github/workflows/capacity-forecast-schedule.yml, which calls
# sysops.views.RunCapacityForecastsView (POST /api/internal/run-capacity-forecasts/)
# rather than reaching into the server directly. You can still run it by
# hand locally: `python manage.py check_capacity_forecasts`.
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
