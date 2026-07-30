from django.urls import path

from . import views

urlpatterns = [
    path("warehouses/", views.warehouse_list, name="warehouse-list"),
    path("warehouses/alerts/capacity/", views.warehouse_alerts, name="warehouse-alerts"),
    path("warehouses/<int:pk>/", views.warehouse_detail, name="warehouse-detail"),
    path("warehouses/<int:pk>/inventory/", views.warehouse_inventory, name="warehouse-inventory"),
    path("dashboard/kpis/", views.dashboard_kpis, name="dashboard-kpis"),
]
