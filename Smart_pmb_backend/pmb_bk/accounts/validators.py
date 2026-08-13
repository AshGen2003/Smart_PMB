# Sri Lankan National Identity Card (NIC) format validation, shared by
# every serializer across accounts/farmers/mills that collects a NIC.
import re

from django.core.exceptions import ValidationError

OLD_NIC_RE = re.compile(r"^\d{9}[VXvx]$")
NEW_NIC_RE = re.compile(r"^\d{12}$")


def validate_nic(value):
    """Old format: 9 digits + V/X (case-insensitive). New format: 12 digits."""
    if not (OLD_NIC_RE.match(value) or NEW_NIC_RE.match(value)):
        raise ValidationError("Enter a valid NIC — either 9 digits followed by V/X, or 12 digits.")
