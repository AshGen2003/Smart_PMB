from django.urls import path

from . import views

urlpatterns = [
    path("approvals/recent/", views.recent_approvals, name="approval-recent"),
]
