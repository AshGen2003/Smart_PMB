# Two reminders, both for deliveries starting within the next 3 hours:
# drivers who haven't accepted (or rejected) their task yet, and drivers
# who have accepted but haven't started the trip. Like
# check_capacity_forecasts, this codebase has no in-process task
# queue/scheduler, so in production this is invoked every 15 minutes by
# .github/workflows/delivery-reminders-schedule.yml, which calls
# sysops.views.RunDeliveryRemindersView
# (POST /api/internal/run-delivery-reminders/) rather than reaching into
# the server directly. You can still run it by hand locally:
# `python manage.py send_delivery_reminders`.
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from farmers.models import Delivery
from farmers.views import _send_accepted_trip_starting_reminder, _send_delivery_reminder


def _starts_within(delivery, now, window_end):
    start = delivery.get_scheduled_datetime()
    return start is not None and now <= start <= window_end


class Command(BaseCommand):
    help = (
        "Reminds drivers, 3 hours before a trip starts, of deliveries they "
        "haven't responded to yet (accept-or-reject), and separately "
        "reminds drivers of deliveries they've already accepted that are "
        "about to start."
    )

    def handle(self, *args, **options):
        now = timezone.now()
        window_end = now + timedelta(hours=3)

        pending_candidates = Delivery.objects.filter(
            assignment_status=Delivery.AssignmentStatus.PENDING,
            status=Delivery.Status.SCHEDULED,
            reminder_sent_at__isnull=True,
            scheduled_time__isnull=False,
        ).select_related("driver", "route", "approved_by")

        pending_reminded = 0
        for delivery in pending_candidates:
            if _starts_within(delivery, now, window_end):
                _send_delivery_reminder(delivery)
                delivery.reminder_sent_at = now
                delivery.save(update_fields=["reminder_sent_at"])
                pending_reminded += 1
                self.stdout.write(
                    f"Reminded {delivery.driver.email} to accept/reject — delivery #{delivery.id} "
                    f"starts {delivery.get_scheduled_datetime()}"
                )

        accepted_candidates = Delivery.objects.filter(
            assignment_status=Delivery.AssignmentStatus.ACCEPTED,
            status=Delivery.Status.SCHEDULED,
            accepted_reminder_sent_at__isnull=True,
            scheduled_time__isnull=False,
        ).select_related("driver", "route", "approved_by")

        accepted_reminded = 0
        for delivery in accepted_candidates:
            if _starts_within(delivery, now, window_end):
                _send_accepted_trip_starting_reminder(delivery)
                delivery.accepted_reminder_sent_at = now
                delivery.save(update_fields=["accepted_reminder_sent_at"])
                accepted_reminded += 1
                self.stdout.write(
                    f"Reminded {delivery.driver.email} of an upcoming trip — delivery #{delivery.id} "
                    f"starts {delivery.get_scheduled_datetime()}"
                )

        self.stdout.write(self.style.SUCCESS(
            f"Reminded {pending_reminded} driver(s) of an unaccepted delivery, "
            f"{accepted_reminded} of an accepted trip starting soon."
        ))
