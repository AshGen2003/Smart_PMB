# URL routes for Authorized Purchaser self-service views. Note: the
# ViewSets for RiceRequest (purchaser side) and OfficerRiceRequestViewSet
# (officer side) are registered separately via a DRF router in the
# project-level pmb_bk/urls.py.
from django.urls import path

from . import views

urlpatterns = [
    path("purchaser/dashboard/", views.PurchaserDashboardView.as_view()),
]
