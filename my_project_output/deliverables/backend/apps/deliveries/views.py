import logging

from django.core.cache import cache
from django.db import models, transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.authentication.permissions import IsPmbOfficer
from apps.common.cache import DASHBOARD_KPIS_KEY, WAREHOUSE_LIST_KEY
from apps.warehouses.models import Warehouse
from .models import Delivery
from .serializers import DeliveryCreateSerializer, DeliveryListSerializer

logger = logging.getLogger("smart_pmb")


@api_view(["GET"])
def delivery_list(request):
    qs = Delivery.objects.select_related("warehouse").all().order_by("-delivery_date")
    serializer = DeliveryListSerializer(qs, many=True)
    return Response({"deliveries": serializer.data})


@api_view(["POST"])
def delivery_create(request):
    permission = IsPmbOfficer()
    if not permission.has_permission(request, None):
        return Response(
            {"error": {"message": "Requires PMB_OFFICER role", "code": "FORBIDDEN"}},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = DeliveryCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "error": {
                    "message": "Invalid request body",
                    "code": "VALIDATION",
                    "details": serializer.errors,
                }
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    warehouse_id = data["warehouse_id"]
    quantity_kg = float(data["quantity_kg"])

    try:
        with transaction.atomic():
            warehouse = Warehouse.objects.select_for_update().get(pk=warehouse_id)
            if float(warehouse.current_stock_kg) < quantity_kg:
                return Response(
                    {
                        "error": {
                            "message": f"Insufficient stock ({float(warehouse.current_stock_kg):.1f} kg available, {quantity_kg:.1f} kg requested)",
                            "code": "INSUFFICIENT_STOCK",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            delivery = Delivery.objects.create(
                purchase_id=data.get("purchase_id"),
                warehouse_id=warehouse_id,
                quantity_kg=quantity_kg,
                vehicle_number=data.get("vehicle_number", ""),
                driver_name=data.get("driver_name", ""),
                pickup_location=data["pickup_location"],
                drop_location=data["drop_location"],
                status=Delivery.Status.SCHEDULED,
            )

            Warehouse.objects.filter(pk=warehouse_id).update(
                current_stock_kg=models.F("current_stock_kg") - quantity_kg
            )

            from apps.audit.models import AuditLog
            AuditLog.objects.create(
                user_id=request.user.pk,
                action="DISPATCH",
                target_type="DELIVERY",
                target_id=delivery.pk,
                details={
                    "warehouse_id": warehouse_id,
                    "quantity_kg": quantity_kg,
                    "pickup": data["pickup_location"],
                    "drop": data["drop_location"],
                },
            )

            cache.delete(WAREHOUSE_LIST_KEY)
            cache.delete(DASHBOARD_KPIS_KEY)

            out = DeliveryListSerializer(delivery)
            return Response({"delivery": out.data}, status=status.HTTP_201_CREATED)

    except Warehouse.DoesNotExist:
        return Response(
            {"error": {"message": "Warehouse not found", "code": "NOT_FOUND"}},
            status=status.HTTP_404_NOT_FOUND,
        )
