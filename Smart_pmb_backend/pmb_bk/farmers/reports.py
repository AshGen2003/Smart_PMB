# Builds the data set behind the PMB officer's Reports page: warehouse
# stock, a recent purchase-transaction log, and the grade/payment/monthly
# charts. Used by both OfficerReportsView (JSON) and OfficerReportsPdfView
# (PDF, via pdf.py) in views.py, so the two always show identical numbers —
# mirrors sysops/reports.py's role for the admin report.
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .forecasting import forecast_next_month_price
from .models import Harvest, PaddyType, Payment, Warehouse
from .serializers import WarehouseSerializer


def build_officer_report_data():
    """Assemble the officer report's data dict: warehouse stock, recent transactions, and chart series."""
    warehouses = Warehouse.objects.select_related("district", "province").order_by("name")
    stock_report = WarehouseSerializer(warehouses, many=True).data

    # Only harvests that have passed approval are meaningful "purchase
    # transactions"; pending/rejected ones aren't purchases yet.
    approved = Harvest.objects.filter(
        status__in=[Harvest.Status.VERIFIED, Harvest.Status.COLLECTED]
    )
    transactions = approved.select_related(
        "farmer", "paddy_type", "warehouse"
    ).prefetch_related("payments").order_by("-harvest_date")[:100]

    transaction_report = []
    for harvest in transactions:
        payment = harvest.payments.first()
        transaction_report.append(
            {
                "id": harvest.id,
                "purchase_date": harvest.purchase_date or harvest.harvest_date,
                "farmer_name": harvest.farmer.name,
                "paddy_type": harvest.paddy_type.type_name if harvest.paddy_type else None,
                "warehouse": harvest.warehouse.name if harvest.warehouse else None,
                "quantity_kg": harvest.quantity_kg,
                "unit_price": harvest.unit_price,
                "amount": payment.amount if payment else None,
                "payment_status": payment.status if payment else None,
                "status": harvest.status,
            }
        )

    grade_counts = {
        row["grade"]: row["count"]
        for row in approved.exclude(grade=None).values("grade").annotate(count=Count("id"))
    }
    grade_distribution = [
        {"grade": grade, "count": grade_counts.get(grade, 0)}
        for grade, _ in Harvest.Grade.choices
    ]

    payment_counts = {
        row["status"]: row["count"]
        for row in Payment.objects.values("status").annotate(count=Count("id"))
    }
    payment_status_breakdown = [
        {"status": status, "label": label, "count": payment_counts.get(status, 0)}
        for status, label in Payment.Status.choices
    ]

    # Cast Decimal -> float here too, same reasoning as _harvest_trend.
    # The annotation keys below are deliberately not named "quantity_kg"/
    # "amount" (matching the source columns): naming an annotation the
    # same as a field it's derived from makes Django resolve later F()
    # references in the same .annotate() call against that new
    # aggregate annotation instead of the raw column, which raises
    # "... is an aggregate" (aggregate-of-an-aggregate) here.
    monthly_purchases = [
        {
            "period": row["month"].strftime("%b %Y"),
            "quantity_kg": float(row["total_quantity_kg"] or 0),
            "amount": float(row["total_amount"] or 0),
        }
        for row in approved.annotate(month=TruncMonth("harvest_date"))
        .values("month")
        .annotate(
            total_quantity_kg=Sum("quantity_kg"),
            total_amount=Sum(
                ExpressionWrapper(
                    F("quantity_kg") * F("unit_price"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                )
            ),
        )
        .order_by("month")
    ]

    # Advisory only — see forecasting.py's docstring. None entries (not
    # enough PriceRecord history yet) are dropped rather than shown as a
    # confusing zero/blank forecast.
    price_forecast = [
        forecast for pt in PaddyType.objects.filter(is_active=True)
        if (forecast := forecast_next_month_price(pt)) is not None
    ]

    return {
        "generated_at": timezone.now(),
        "stock_report": stock_report,
        "transaction_report": transaction_report,
        "charts": {
            "grade_distribution": grade_distribution,
            "payment_status_breakdown": payment_status_breakdown,
            "monthly_purchases": monthly_purchases,
        },
        "price_forecast": price_forecast,
    }
