from django.urls import path

from . import views

urlpatterns = [
    path("districts/", views.DistrictListView.as_view()),
    path("farmer/dashboard/", views.FarmerDashboardView.as_view()),
    path("notifications/<int:pk>/read/", views.NotificationMarkReadView.as_view()),
]
