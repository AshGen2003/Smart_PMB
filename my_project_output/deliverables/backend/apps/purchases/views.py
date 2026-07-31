import logging

from django.core.cache import cache
from django.db import models, transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.authentication.permissions import IsPmbOfficerOrPurchaser
from apps.common.cache import DASHBOARD_KPIS_KEY, WAREHOUSE_LIST_KEY
from apps.warehouses.models import Inventory, Warehouse
from .models import Purchase
from .serializers import PurchaseCreateSerializer, PurchaseListSerializer

logger = logging.getLogger("smart_pmb")


@api_view(["GET"])
def purchase_list(request):
    status_filter = request.query_params.get("status", "").upper()
    qs = Purchase.objects.select_related("warehouse").all().order_by("-purchase_date")
    if status_filter in ("PENDING", "COMPLETED", "FAILED"):
        qs = qs.filter(payment_status=status_filter)

    page = qs[:100]
    serializer = PurchaseListSerializer(page, many=True)
    return Response({"purchases": serializer.data})


@api_view(["POST"])
def purchase_create(request):
    permission = IsPmbOfficerOrPurchaser()
    if not permission.has_permission(request, None):
        return Response(
            {"error": {"message": "Requires PMB_OFFICER or AUTHORIZED_PURCHASER role", "code": "FORBIDDEN"}},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = PurchaseCreateSerializer(data=request.data)
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
    farmer_name = data["farmer_name"]
    paddy_type = data["paddy_type"]
    amount_lkr = float(data["amount_lkr"])
    payment_status = data.get("payment_status", "PENDING")
    user_id = request.user.pk

    try:
        with transaction.atomic():
            warehouse = Warehouse.objects.select_for_update().get(
                pk=warehouse_id
            )
            remaining = float(warehouse.capacity_kg) - float(warehouse.current_stock_kg)
            if quantity_kg > remaining:
                raise ValueError(
                    f"Intake exceeds remaining capacity ({remaining:.1f} kg available)"
                )

            purchase = Purchase.objects.create(
                farmer_name=farmer_name,
                purchaser_id=user_id,
                warehouse_id=warehouse_id,
                paddy_type=paddy_type,
                quantity_kg=quantity_kg,
                amount_lkr=amount_lkr,
                payment_status=payment_status,
            )

            Inventory.objects.create(
                warehouse_id=warehouse_id,
                paddy_type=paddy_type,
                quantity_kg=quantity_kg,
            )

            Warehouse.objects.filter(pk=warehouse_id).update(
                current_stock_kg=models.F("current_stock_kg") + quantity_kg
            )

            _log_audit(
                user_id=user_id,
                action="INTAKE",
                target_type="PURCHASE",
                target_id=purchase.pk,
                details={
                    "warehouse_id": warehouse_id,
                    "farmer_name": farmer_name,
                    "paddy_type": paddy_type,
                    "quantity_kg": quantity_kg,
                    "amount_lkr": amount_lkr,
                },
            )

            # Invalidate caches
            cache.delete(WAREHOUSE_LIST_KEY)
            cache.delete(DASHBOARD_KPIS_KEY)

            out = PurchaseListSerializer(purchase)
            return Response({"purchase": out.data}, status=status.HTTP_201_CREATED)

    except Warehouse.DoesNotExist:
        return Response(
            {"error": {"message": "Warehouse not found", "code": "NOT_FOUND"}},
            status=status.HTTP_404_NOT_FOUND,
        )
    except ValueError as e:
        return Response(
            {
                "error": {
                    "message": str(e),
                    "code": "OVER_CAPACITY",
                }
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


def _log_audit(user_id, action, target_type, target_id, details):
    from apps.audit.models import AuditLog
    AuditLog.objects.create(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
