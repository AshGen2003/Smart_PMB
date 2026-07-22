# Custom manager for the User model. Django requires a custom manager
# whenever the default `username` field is removed, since the built-in
# UserManager assumes usernames. This one creates users/superusers by
# email and password, and auto-assigns a sensible default Role when one
# isn't explicitly supplied.
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """Manager for User: builds users keyed by email instead of username."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        # Shared implementation behind create_user/create_superuser.
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # hashes the password before saving
        user.save(using=self._db)
        return user

    def create_user(self, email=None, password=None, **extra_fields):
        """Create a regular (non-staff, non-superuser) account, defaulting to the "farmer" role."""
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        if "role" not in extra_fields:
            extra_fields["role"] = self._get_default_role("farmer")
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email=None, password=None, **extra_fields):
        """Create an admin/superuser account (used by `manage.py createsuperuser`), defaulting to the "admin" role."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if "role" not in extra_fields:
            extra_fields["role"] = self._get_default_role("admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)

    def _get_default_role(self, slug):
        # Self-healing: create_superuser/create_user may run before the
        # seed-data migration has been applied (e.g. a fresh DB where
        # `createsuperuser` is run out of order).
        from .models import Role

        role, _ = Role.objects.get_or_create(
            slug=slug,
            defaults={"name": slug.replace("_", " ").title(), "is_system": True},
        )
        return role
