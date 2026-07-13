import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify

from .managers import UserManager


class Permission(models.Model):
    codename = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["codename"]

    def __str__(self):
        return self.label


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    # Derived from name only at creation, then immutable — nothing in code
    # reads role.name, only role.slug (for "admin"/"farmer"), so keeping the
    # slug stable regardless of later renames avoids breaking those checks.
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    # Blocks deletion only (see accounts/views.py RoleViewSet) — never blocks
    # renaming or permission changes.
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name).replace("-", "_")
        super().save(*args, **kwargs)


class User(AbstractUser):
    username = None
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    email_confirmed = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
