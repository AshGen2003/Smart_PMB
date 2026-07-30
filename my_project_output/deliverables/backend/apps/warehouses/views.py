import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.authentication.permissions import IsPmbOfficer
from apps.common.cache import DASHBOARD_KPIS_KEY, WAREHOUSE_LIST_KEY
from .models import Inventory, Warehouse
from .serializers import (
    WarehouseAlertSerializer,
    WarehouseCreateSerializer,
    WarehouseListSerializer,
)

logger = logging.getLogger("smart_pmb")


@api_view(["GET"])
def warehouse_list(request):
    cached = cache.get(WAREHOUSE_LIST_KEY)
    if cached is not None:
        return Response({"warehouses": cached})

    qs = Warehouse.objects.all().order_by("warehouse_id")
    serializer = WarehouseListSerializer(qs, many=True)
    data = serializer.data
    cache.set(WAREHOUSE_LIST_KEY, data, 300)
    return Response({"warehouses": data})


@api_view(["GET"])
def warehouse_detail(request, pk):
    try:
        warehouse = Warehouse.objects.get(pk=pk)
    except Warehouse.DoesNotExist:
        return Response(
            {"error": {"message": "Warehouse not found", "code": "NOT_FOUND"}},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = WarehouseListSerializer(warehouse)
    return Response({"warehouse": serializer.data})


@api_view(["GET"])
def warehouse_inventory(request, pk):
    try:
        Warehouse.objects.get(pk=pk)
    except Warehouse.DoesNotExist:
        return Response(
            {"error": {"message": "Warehouse not found", "code": "NOT_FOUND"}},
            status=status.HTTP_404_NOT_FOUND,
        )
    items = (
        Inventory.objects.filter(warehouse_id=pk)
        .order_by("-storage_date")
        .values("inventory_id", "paddy_type", "quantity_kg", "storage_date")
    )
    inventory = [
        {
            "inventory_id": item["inventory_id"],
            "paddy_type": item["paddy_type"],
            "quantity_kg": float(item["quantity_kg"]),
            "storage_date": (
                item["storage_date"].isoformat() if item["storage_date"] else None
            ),
        }
        for item in items
    ]
    return Response({"inventory": inventory})


@api_view(["POST"])
def warehouse_create(request):
    permission = IsPmbOfficer()
    if not permission.has_permission(request, None):
        return Response(
            {"error": {"message": "Requires PMB_OFFICER role", "code": "FORBIDDEN"}},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = WarehouseCreateSerializer(data=request.data)
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
    warehouse = serializer.save()
    cache.delete(WAREHOUSE_LIST_KEY)
    cache.delete(DASHBOARD_KPIS_KEY)
    out = WarehouseListSerializer(warehouse)
    return Response({"warehouse": out.data}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def warehouse_alerts(request):
    qs = Warehouse.objects.all()
    results = []
    for w in qs:
        pct = w.utilization_pct
        if pct >= 85:
            results.append(
                {
                    "warehouse": WarehouseAlertSerializer(w).data,
                    "level": "high",
                    "message": f"{w.name} is at {pct}% capacity \u2014 arrange dispatch soon.",
                }
            )
        elif pct <= 20:
            results.append(
                {
                    "warehouse": WarehouseAlertSerializer(w).data,
                    "level": "low",
                    "message": f"{w.name} is only {pct}% utilised \u2014 consider redirecting intake.",
                }
            )
    return Response({"alerts": results})


@api_view(["GET"])
def dashboard_kpis(request):
    cached = cache.get(DASHBOARD_KPIS_KEY)
    if cached is not None:
        return Response(cached)

    qs = Warehouse.objects.all()
    total = qs.count()
    capacity = sum(float(w.capacity_kg) for w in qs)
    stock = sum(float(w.current_stock_kg) for w in qs)
    util = round((stock / capacity * 100), 1) if capacity else 0.0

    data = {
        "kpis": {
            "total_warehouses": total,
            "total_capacity_kg": capacity,
            "total_stock_kg": stock,
            "utilization_pct": util,
        }
    }
    cache.set(DASHBOARD_KPIS_KEY, data, 300)
    return Response(data)
