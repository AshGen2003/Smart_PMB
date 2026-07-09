import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MODERATOR = "moderator", "Moderator"
        PMB_OFFICER = "pmb_officer", "PMB Officer"
        FARMER = "farmer", "Farmer"
        MILL_OWNER = "mill_owner", "Mill Owner"
        DRIVER = "driver", "Driver"
        WAREHOUSE_MANAGER = "warehouse_manager", "Warehouse Manager"
        AUTHORIZED_PURCHASER = "authorized_purchaser", "Authorized Purchaser"

    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.FARMER)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
