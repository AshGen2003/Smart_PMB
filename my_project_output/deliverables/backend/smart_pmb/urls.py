from django.contrib import admin
from django.urls import include, path

from apps.common.views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/', include('apps.authentication.urls')),
    path('api/', include('apps.warehouses.urls')),
    path('api/', include('apps.purchases.urls')),
    path('api/', include('apps.deliveries.urls')),
    path('api/', include('apps.approvals.urls')),
]
