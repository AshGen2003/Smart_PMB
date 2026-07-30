from django.urls import path

from . import views

urlpatterns = [
    path("purchases/", views.purchase_list, name="purchase-list"),
    path("purchases/create/", views.purchase_create, name="purchase-create"),
]
