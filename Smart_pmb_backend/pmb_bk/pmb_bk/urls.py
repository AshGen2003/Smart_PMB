"""
URL configuration for pmb_bk project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    AdminOverviewView,
    AdminUserViewSet,
    PermissionListView,
    RoleViewSet,
)
from farmers.views import OfficerHarvestViewSet, PaddyTypeViewSet, WarehouseViewSet
from sysops.views import (
    AdminReportPdfView,
    AdminReportView,
    AuditLogViewSet,
    AuthLogViewSet,
    BackupRecordViewSet,
    SystemAlertViewSet,
    SystemConfigView,
)

router = DefaultRouter()
router.register('admin/users', AdminUserViewSet, basename='admin-users')
router.register('admin/roles', RoleViewSet, basename='admin-roles')
router.register('admin/warehouses', WarehouseViewSet, basename='admin-warehouses')
router.register('admin/paddy-types', PaddyTypeViewSet, basename='admin-paddy-types')
router.register('admin/harvests', OfficerHarvestViewSet, basename='admin-harvests')
router.register('admin/audit-logs', AuditLogViewSet, basename='admin-audit-logs')
router.register('admin/auth-logs', AuthLogViewSet, basename='admin-auth-logs')
router.register('admin/alerts', SystemAlertViewSet, basename='admin-alerts')
router.register('admin/backups', BackupRecordViewSet, basename='admin-backups')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('farmers.urls')),
    path('api/admin/permissions/', PermissionListView.as_view()),
    path('api/admin/overview/', AdminOverviewView.as_view()),
    path('api/admin/system-config/', SystemConfigView.as_view()),
    path('api/admin/reports/admin-summary/', AdminReportView.as_view()),
    path('api/admin/reports/admin-summary/pdf/', AdminReportPdfView.as_view()),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
