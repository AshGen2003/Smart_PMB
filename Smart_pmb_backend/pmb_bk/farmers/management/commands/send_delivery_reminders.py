# Reminds a delivery's assigned driver when they haven't accepted (or
# rejected) it and the trip is due to start within the next 3 hours. Like
# check_capacity_forecasts, this codebase has no in-process task
# queue/scheduler, so in production this is invoked every 15 minutes by
# .github/workflows/delivery-reminders-schedule.yml, which calls
# sysops.views.RunDeliveryRemindersView
# (POST /api/internal/run-delivery-reminders/) rather than reaching into
# the server directly. You can still run it by hand locally:
# `python manage.py send_delivery_reminders`.
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from farmers.models import Delivery
from farmers.views import _send_delivery_reminder


class Command(BaseCommand):
    help = "Reminds drivers of pending (not yet accepted) deliveries scheduled to start within the next 3 hours."

    def handle(self, *args, **options):
        now = timezone.now()
        window_end = now + timedelta(hours=3)

        candidates = Delivery.objects.filter(
            assignment_status=Delivery.AssignmentStatus.PENDING,
            status=Delivery.Status.SCHEDULED,
            reminder_sent_at__isnull=True,
            scheduled_time__isnull=False,
        ).select_related("driver", "route", "approved_by")

        reminded = 0
        for delivery in candidates:
            start_dt = timezone.make_aware(
                datetime.combine(delivery.scheduled_date, delivery.scheduled_time)
            )
            if now <= start_dt <= window_end:
                _send_delivery_reminder(delivery)
                delivery.reminder_sent_at = now
                delivery.save(update_fields=["reminder_sent_at"])
                reminded += 1
                self.stdout.write(f"Reminded {delivery.driver.email} — delivery #{delivery.id} starts {start_dt}")

        self.stdout.write(self.style.SUCCESS(f"Reminded {reminded} driver(s) of an unaccepted delivery."))
