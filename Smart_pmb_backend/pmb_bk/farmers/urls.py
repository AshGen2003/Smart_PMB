# URL routes for farmer self-service and PMB officer views. Note: the
# ViewSets for Warehouse, PaddyType, and Harvest management are registered
# separately via a DRF router in the project-level pmb_bk/urls.py.
from django.urls import path

from . import views

urlpatterns = [
    path("districts/", views.DistrictListView.as_view()),  # public dropdown data for registration
    path("farmer/dashboard/", views.FarmerDashboardView.as_view()),
    path("notifications/<int:pk>/read/", views.NotificationMarkReadView.as_view()),
    path("officer/dashboard/", views.OfficerDashboardView.as_view()),
    path("officer/reports/", views.OfficerReportsView.as_view()),
    path("officer/farmers/", views.FarmerListView.as_view()),  # farmer picker for recording a purchase
]
