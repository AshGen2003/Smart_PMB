# URL routes for mill-owner self-service views. Note: the ViewSets for
# License and MillingReport (mill-owner side) and OfficerLicenseViewSet
# (officer side) are registered separately via a DRF router in the
# project-level pmb_bk/urls.py.
from django.urls import path

from . import views

urlpatterns = [
    path("mill-owner/dashboard/", views.MillOwnerDashboardView.as_view()),
    path("mill-owner/profile/", views.MillOwnerProfileView.as_view()),
]
