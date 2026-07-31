from django.core.management.base import BaseCommand

from apps.authentication.models import User


class Command(BaseCommand):
    help = "Create a default PMB officer login (admin@pmb.lk / admin123)."

    def handle(self, *args, **options):
        email = "admin@pmb.lk"
        password = "admin123"

        if User.objects.filter(email=email).exists():
            self.stdout.write(f"{email} already exists, skipping.")
            return

        User.objects.create_user(
            username=email,
            email=email,
            password=password,
            role=User.Role.PMB_OFFICER,
            first_name="Admin",
            last_name="User",
        )
        self.stdout.write(self.style.SUCCESS(f"Created default user {email} / {password}"))
