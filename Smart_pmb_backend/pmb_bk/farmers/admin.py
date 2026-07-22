# Registers the farmers app's models with Django's built-in admin site
# using default admin behavior (no custom list displays/search here).
from django.contrib import admin

from .models import (
    District,
    Farmer,
    Harvest,
    Notification,
    PaddyType,
    Payment,
    PriceRecord,
    Province,
)

admin.site.register(Province)
admin.site.register(District)
admin.site.register(Farmer)
admin.site.register(PaddyType)
admin.site.register(Harvest)
admin.site.register(Payment)
admin.site.register(PriceRecord)
admin.site.register(Notification)
