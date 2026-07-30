from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        PMB_OFFICER = "PMB_OFFICER", "PMB Officer"
        AUTHORIZED_PURCHASER = "AUTHORIZED_PURCHASER", "Authorized Purchaser"

    role = models.CharField(
        max_length=30, choices=Role.choices, default=Role.PMB_OFFICER
    )
    # Remove username uniqueness — use email as login identifier
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.email} ({self.role})"
