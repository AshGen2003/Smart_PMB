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
    LicenseApplicationViewSet,
    MessageCreateView,
    MessageHistoryView,
    MessageInboxView,
    MessageMarkAllReadView,
    MessageMarkReadView,
    MessageRecipientsView,
    OnlineRolesView,
    PermissionListView,
    RoleViewSet,
)
from farmers.views import (
    DeliveryViewSet,
    DriverFuelRecordViewSet,
    DriverMaintenanceRecordViewSet,
    DriverOptionsView,
    FarmerDeliverySlotViewSet,
    FarmerHarvestViewSet,
    FuelRecordViewSet,
    InventoryViewSet,
    MaintenanceRecordViewSet,
    OfficerHarvestViewSet,
    PaddyTypeViewSet,
    RouteViewSet,
    TransactionLogViewSet,
    TransportationDashboardView,
    VehicleViewSet,
    WarehouseManagerOptionsView,
    WarehouseManagerTransferRequestViewSet,
    WarehouseTransferRequestViewSet,
    WarehouseViewSet,
)
from mills.views import (
    LicenseViewSet,
    MillingAllocationViewSet,
    MillingReportViewSet,
    MillingReturnRequestViewSet,
    MillOptionsView,
    OfficerInspectionViewSet,
    OfficerLicenseViewSet,
    OfficerMillingAllocationViewSet,
    OfficerMillingReturnRequestViewSet,
)
from purchases.views import (
    DispatchManifestViewSet,
    FarmGatePurchaseViewSet,
    OfficerAuthorizedPurchaserViewSet,
    OfficerDispatchManifestViewSet,
    OfficerFarmGatePurchaseViewSet,
    OfficerRiceRequestViewSet,
    RiceRequestViewSet,
)
from sysops.views import (
    AdminReportPdfView,
    AdminReportView,
    AuditLogViewSet,
    AuthLogViewSet,
    BackupRecordViewSet,
    ErrorLogViewSet,
    RunCapacityForecastsView,
    RunDeliveryRemindersView,
    StripeWebhookView,
    SystemAlertViewSet,
    SystemChangeRequestViewSet,
    SystemConfigView,
)

# DRF router auto-generates the standard list/retrieve/create/update/destroy
# routes (plus any @action endpoints) for each admin-facing ViewSet below,
# all mounted under /api/... via the include() at the bottom of this file.
router = DefaultRouter()
router.register('admin/users', AdminUserViewSet, basename='admin-users')
router.register('admin/roles', RoleViewSet, basename='admin-roles')
router.register('admin/license-applications', LicenseApplicationViewSet, basename='admin-license-applications')
router.register('admin/warehouses', WarehouseViewSet, basename='admin-warehouses')
router.register('admin/warehouse-transfers', WarehouseTransferRequestViewSet, basename='admin-warehouse-transfers')
router.register(
    'warehouse-manager/transfer-requests', WarehouseManagerTransferRequestViewSet,
    basename='warehouse-manager-transfer-requests',
)
router.register('admin/inventory', InventoryViewSet, basename='admin-inventory')
router.register('admin/transaction-log', TransactionLogViewSet, basename='admin-transaction-log')
router.register('admin/paddy-types', PaddyTypeViewSet, basename='admin-paddy-types')
router.register('admin/harvests', OfficerHarvestViewSet, basename='admin-harvests')
router.register('farmer/harvests', FarmerHarvestViewSet, basename='farmer-harvests')
router.register('farmer/delivery-slots', FarmerDeliverySlotViewSet, basename='farmer-delivery-slots')
router.register('mill-owner/licenses', LicenseViewSet, basename='mill-owner-licenses')
router.register('mill-owner/milling-reports', MillingReportViewSet, basename='mill-owner-milling-reports')
router.register('admin/mill-licenses', OfficerLicenseViewSet, basename='admin-mill-licenses')
router.register('admin/mill-inspections', OfficerInspectionViewSet, basename='admin-mill-inspections')
router.register('mill-owner/milling-allocations', MillingAllocationViewSet, basename='mill-owner-milling-allocations')
router.register('admin/milling-allocations', OfficerMillingAllocationViewSet, basename='admin-milling-allocations')
router.register('mill-owner/milling-returns', MillingReturnRequestViewSet, basename='mill-owner-milling-returns')
router.register('admin/milling-returns', OfficerMillingReturnRequestViewSet, basename='admin-milling-returns')
router.register('purchaser/requests', RiceRequestViewSet, basename='purchaser-requests')
router.register('admin/rice-requests', OfficerRiceRequestViewSet, basename='admin-rice-requests')
router.register('admin/authorized-purchasers', OfficerAuthorizedPurchaserViewSet, basename='admin-authorized-purchasers')
router.register('purchaser/farm-gate-purchases', FarmGatePurchaseViewSet, basename='purchaser-farm-gate-purchases')
router.register('admin/farm-gate-purchases', OfficerFarmGatePurchaseViewSet, basename='admin-farm-gate-purchases')
router.register('purchaser/dispatch-manifests', DispatchManifestViewSet, basename='purchaser-dispatch-manifests')
router.register('admin/dispatch-manifests', OfficerDispatchManifestViewSet, basename='admin-dispatch-manifests')
router.register('admin/audit-logs', AuditLogViewSet, basename='admin-audit-logs')
router.register('admin/auth-logs', AuthLogViewSet, basename='admin-auth-logs')
router.register('admin/error-logs', ErrorLogViewSet, basename='admin-error-logs')
router.register('admin/alerts', SystemAlertViewSet, basename='admin-alerts')
router.register('admin/backups', BackupRecordViewSet, basename='admin-backups')
router.register('admin/vehicles', VehicleViewSet, basename='admin-vehicles')
router.register('admin/routes', RouteViewSet, basename='admin-routes')
router.register('admin/deliveries', DeliveryViewSet, basename='admin-deliveries')
router.register('admin/fuel-records', FuelRecordViewSet, basename='admin-fuel-records')
router.register('admin/maintenance-records', MaintenanceRecordViewSet, basename='admin-maintenance-records')
router.register('driver/fuel-records', DriverFuelRecordViewSet, basename='driver-fuel-records')
router.register('driver/maintenance-records', DriverMaintenanceRecordViewSet, basename='driver-maintenance-records')
router.register('system-requests', SystemChangeRequestViewSet, basename='system-requests')

urlpatterns = [
    path('admin/', admin.site.urls),  # Django's built-in admin site
    path('api/auth/', include('accounts.urls')),  # login/register/refresh/logout/me
    path('api/', include('farmers.urls')),  # farmer self-service + harvest submission endpoints
    path('api/', include('mills.urls')),  # mill owner self-service endpoints
    path('api/', include('purchases.urls')),  # authorized purchaser self-service endpoints
    path('api/admin/permissions/', PermissionListView.as_view()),
    path('api/admin/overview/', AdminOverviewView.as_view()),
    path('api/admin/overview/online/', OnlineRolesView.as_view()),
    path('api/admin/system-config/', SystemConfigView.as_view()),
    path('api/admin/reports/admin-summary/', AdminReportView.as_view()),
    path('api/admin/reports/admin-summary/pdf/', AdminReportPdfView.as_view()),
    path('api/admin/transportation/dashboard/', TransportationDashboardView.as_view()),
    path('api/admin/drivers/', DriverOptionsView.as_view()),
    path('api/admin/warehouse-managers/', WarehouseManagerOptionsView.as_view()),
    path('api/admin/mills/', MillOptionsView.as_view()),
    path('api/stripe/webhook/', StripeWebhookView.as_view()),
    path('api/internal/run-capacity-forecasts/', RunCapacityForecastsView.as_view()),
    path('api/internal/run-delivery-reminders/', RunDeliveryRemindersView.as_view()),
    path('api/messages/', MessageCreateView.as_view()),
    path('api/messages/inbox/', MessageInboxView.as_view()),
    path('api/messages/history/', MessageHistoryView.as_view()),
    path('api/messages/recipients/', MessageRecipientsView.as_view()),
    path('api/messages/mark-all-read/', MessageMarkAllReadView.as_view()),
    path('api/messages/<int:pk>/read/', MessageMarkReadView.as_view()),
    path('api/', include(router.urls)),
]

# Serve uploaded media files (profile pictures, etc.) directly from Django
# during local development only; in production this should be handled by
# the web server / a storage service instead.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
