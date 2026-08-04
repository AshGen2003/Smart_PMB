# Lightweight, stdlib-only price/capacity/yield forecasting — officer-facing
# advisories only. Nothing here ever writes to PaddyType.guaranteed_price;
# an officer always has to act on a suggestion manually via /pricing.
import statistics
from datetime import timedelta

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from sysops.models import SystemAlert

from .models import Harvest, PaddyType, TransactionLog

MIN_PRICE_POINTS = 3
MIN_CAPACITY_POINTS = 2
MIN_YIELD_POINTS = 3
CAPACITY_WARNING_DAYS = 14


def forecast_next_month_price(paddy_type: PaddyType):
    """
    Fits a simple linear trend over this paddy type's PriceRecord history
    and projects one point forward. Returns None if there isn't enough
    history yet (fewer than MIN_PRICE_POINTS snapshots) to make the trend
    meaningful.
    """
    records = list(paddy_type.price_records.order_by("effective_date"))
    if len(records) < MIN_PRICE_POINTS:
        return None

    xs = [float(i) for i in range(len(records))]
    ys = [float(r.guaranteed_price) for r in records]
    slope, intercept = statistics.linear_regression(xs, ys)
    suggested_price = round(slope * len(records) + intercept, 2)

    return {
        "paddy_type": paddy_type.type_name,
        "current_price": float(paddy_type.guaranteed_price),
        "suggested_price": max(suggested_price, 0.0),
        "based_on_points": len(records),
    }


def forecast_next_harvest_yield(paddy_type: PaddyType):
    """
    Fits a simple linear trend over this paddy type's monthly approved-
    harvest volume (VERIFIED/COLLECTED Harvests, grouped by month) and
    projects one month forward. Returns None if there isn't enough history
    yet (fewer than MIN_YIELD_POINTS months) to make the trend meaningful —
    same "advisory only" reasoning as forecast_next_month_price.
    """
    monthly = list(
        Harvest.objects.filter(
            paddy_type=paddy_type,
            status__in=[Harvest.Status.VERIFIED, Harvest.Status.COLLECTED],
        )
        .annotate(month=TruncMonth("harvest_date"))
        .values("month")
        .annotate(total_kg=Sum("quantity_kg"))
        .order_by("month")
    )
    if len(monthly) < MIN_YIELD_POINTS:
        return None

    xs = [float(i) for i in range(len(monthly))]
    ys = [float(row["total_kg"] or 0) for row in monthly]
    slope, intercept = statistics.linear_regression(xs, ys)
    suggested_yield_kg = round(slope * len(monthly) + intercept, 2)

    return {
        "paddy_type": paddy_type.type_name,
        "last_month_kg": ys[-1],
        "suggested_next_month_kg": max(suggested_yield_kg, 0.0),
        "based_on_points": len(monthly),
    }


def _raise_predictive_capacity_alert(warehouse, days_until_full):
    """
    Raises a SystemAlert warning a warehouse is projected to fill up soon —
    the proactive counterpart to farmers/views.py's
    _raise_high_capacity_alert (which only fires once capacity is already
    crossed). Dedupes against any already-open alert of the same type for
    this warehouse so re-running the forecast doesn't spam.
    """
    alert_type = f"predicted_capacity_warehouse_{warehouse.id}"
    already_open = SystemAlert.objects.filter(
        alert_type=alert_type, status=SystemAlert.Status.OPEN
    ).exists()
    if already_open:
        return
    SystemAlert.objects.create(
        alert_type=alert_type,
        level=SystemAlert.Level.WARNING,
        message=(
            f"{warehouse.name} is projected to reach 90% capacity in "
            f"about {days_until_full:.0f} day(s) at its recent intake rate — "
            "consider arranging transport or offload ahead of time."
        ),
    )


def forecast_warehouse_capacity_risk(warehouse):
    """
    Extrapolates a warehouse's recent stock trend (from the last 30 days of
    TransactionLog entries) to estimate days until it crosses 90% capacity.
    Returns None (and raises nothing) unless that's within
    CAPACITY_WARNING_DAYS — including for warehouses with no capacity set,
    no recent net growth, or too little history to extrapolate from. Only
    raises a predictive SystemAlert, and only returns a result dict, when
    genuinely at risk.
    """
    if not warehouse.capacity:
        return None

    since = timezone.now() - timedelta(days=30)
    logs = list(
        TransactionLog.objects.filter(warehouse=warehouse, created_at__gte=since).order_by("created_at")
    )
    if len(logs) < MIN_CAPACITY_POINTS:
        return None

    days_elapsed = (timezone.now() - logs[0].created_at).total_seconds() / 86400
    if days_elapsed <= 0:
        return None

    net_change = sum(float(log.quantity_change) for log in logs)
    daily_rate = net_change / days_elapsed
    if daily_rate <= 0:
        # Flat or shrinking stock is never at risk of overflowing.
        return None

    remaining = float(warehouse.capacity) * 0.9 - float(warehouse.current_stock)
    if remaining <= 0:
        # Already at/above 90% — farmers/views.py's reactive alert handles this.
        return None

    days_until_full = remaining / daily_rate
    if days_until_full > CAPACITY_WARNING_DAYS:
        return None

    _raise_predictive_capacity_alert(warehouse, days_until_full)
    return {"warehouse": warehouse.name, "days_until_90_pct": round(days_until_full, 1)}
