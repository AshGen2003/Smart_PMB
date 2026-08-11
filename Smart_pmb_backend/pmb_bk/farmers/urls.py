# URL routes for farmer self-service and PMB officer views. Note: the
# ViewSets for Warehouse, PaddyType, and Harvest management are registered
# separately via a DRF router in the project-level pmb_bk/urls.py.
from django.urls import path

from . import views

urlpatterns = [
    path("districts/", views.DistrictListView.as_view()),  # public dropdown data for registration
    path("warehouses/options/", views.WarehouseOptionsView.as_view()),  # destination-warehouse picker for mill-owner/purchaser self-service forms
    path("farmer/dashboard/", views.FarmerDashboardView.as_view()),
    path("farmer/bank-details/", views.FarmerBankDetailsView.as_view()),
    path("notifications/<int:pk>/read/", views.NotificationMarkReadView.as_view()),
    path("officer/dashboard/", views.OfficerDashboardView.as_view()),
    path("officer/reports/", views.OfficerReportsView.as_view()),
    path("officer/reports/pdf/", views.OfficerReportsPdfView.as_view()),
    path("officer/farmers/", views.FarmerListView.as_view()),  # farmer picker for recording a purchase
    path("driver/dashboard/", views.DriverDashboardView.as_view()),
    path("driver/vehicle-info/", views.DriverVehicleInfoView.as_view()),
    path("driver/deliveries/<int:pk>/respond/", views.DeliveryRespondView.as_view()),
    path("driver/deliveries/<int:pk>/status/", views.DriverDeliveryStatusView.as_view()),
    path("driver/deliveries/<int:pk>/location/", views.DeliveryLocationPingView.as_view()),
    path("warehouse-manager/dashboard/", views.WarehouseManagerDashboardView.as_view()),
    path("warehouse-manager/adjust-stock/", views.WarehouseManagerAdjustStockView.as_view()),
    path("warehouse-manager/alerts/<int:pk>/resolve/", views.WarehouseManagerResolveAlertView.as_view()),
    path("warehouse-manager/transactions/", views.WarehouseManagerTransactionsView.as_view()),
    path("warehouse-manager/transfer-options/", views.WarehouseManagerTransferOptionsView.as_view()),
    path("warehouse-manager/delivery-slots/lookup/", views.WarehouseManagerDeliverySlotLookupView.as_view()),
    path("warehouse-manager/delivery-slots/<int:pk>/check-in/", views.WarehouseManagerDeliverySlotCheckInView.as_view()),
    path("delivery-slots/<str:booking_reference>/qr.png", views.DeliverySlotQrView.as_view()),
    path("public/trace/<str:lot_code>/", views.PublicHarvestTraceView.as_view()),
    path("public/trace/<str:lot_code>/qr.png", views.PublicHarvestTraceQrView.as_view()),
    path("public/transparency/", views.PublicTransparencyStatsView.as_view()),
]
