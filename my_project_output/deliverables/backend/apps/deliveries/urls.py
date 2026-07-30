from django.urls import path

from . import views

urlpatterns = [
    path("deliveries/", views.delivery_list, name="delivery-list"),
    path("deliveries/create/", views.delivery_create, name="delivery-create"),
]
