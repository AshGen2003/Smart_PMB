# Renders the officer's "Reports & Analytics" page as a PDF, styled to
# match the admin governance report exactly — same watermark, table, and
# chart-drawing helpers, imported from sysops.pdf rather than duplicated.
# The actual report content comes from reports.py's
# build_officer_report_data(); this module is purely presentational.
import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.shapes import Drawing
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from sysops.pdf import CHART_AMBER, CHART_INDIGO, CHART_TEAL, PRIMARY, _table, _watermark

# Transaction table is capped in the PDF (unlike the JSON API's 100-row
# cap) so the report stays a readable summary rather than a many-page dump
# — the full log is already browsable/exportable to CSV on the web page.
MAX_TRANSACTION_ROWS = 30


def _stock_rows(data):
    rows = [
        [
            f"{w['name']} ({w['code']})",
            w["district_name"] or "—",
            f"{float(w['current_stock']):,.0f}",
            f"{float(w['capacity']):,.0f}",
            w["status"],
        ]
        for w in data["stock_report"]
    ]
    return rows or [["—", "—", "—", "—", "—"]]


def _transaction_rows(data):
    rows = [
        [
            str(t["purchase_date"]),
            t["farmer_name"],
            t["paddy_type"] or "—",
            t["warehouse"] or "—",
            f"{float(t['quantity_kg']):,.0f}",
            f"Rs. {float(t['amount']):,.0f}" if t["amount"] else "—",
            t["status"],
        ]
        for t in data["transaction_report"][:MAX_TRANSACTION_ROWS]
    ]
    return rows or [["—", "—", "—", "—", "—", "—", "—"]]


def _monthly_purchases_chart(data):
    """Line chart of monthly purchase quantity/amount, matching the web report's chart, or None if there's no data."""
    trend = data["charts"]["monthly_purchases"]
    if not trend:
        return None

    drawing = Drawing(460, 220)
    chart = HorizontalLineChart()
    chart.x, chart.y = 50, 30
    chart.width, chart.height = 330, 160
    chart.data = [[t["quantity_kg"] for t in trend]]
    chart.categoryAxis.categoryNames = [t["period"] for t in trend]
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.dy = -10
    chart.categoryAxis.labels.fontSize = 6
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.lines[0].strokeColor = CHART_TEAL
    chart.lines[0].strokeWidth = 1.5
    drawing.add(chart)

    legend = Legend()
    legend.x, legend.y = 400, 170
    legend.dx, legend.dy = 8, 8
    legend.fontSize = 7
    legend.alignment = "right"
    legend.colorNamePairs = [(CHART_TEAL, "Quantity (kg)")]
    drawing.add(legend)
    return drawing


def _grade_distribution_chart(data):
    """Bar chart of harvest counts per grade, matching the web report's pie chart in spirit, or None if empty."""
    grades = [g for g in data["charts"]["grade_distribution"] if g["count"] > 0]
    if not grades:
        return None

    drawing = Drawing(460, 220)
    chart = VerticalBarChart()
    chart.x, chart.y = 50, 30
    chart.width, chart.height = 330, 160
    chart.data = [[g["count"] for g in grades]]
    chart.categoryAxis.categoryNames = [f"Grade {g['grade']}" for g in grades]
    chart.categoryAxis.labels.fontSize = 8
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.bars[0].fillColor = CHART_INDIGO
    drawing.add(chart)
    return drawing


def _payment_status_chart(data):
    """Bar chart of payment counts per status, matching the web report's chart, or None if empty."""
    statuses = [s for s in data["charts"]["payment_status_breakdown"] if s["count"] > 0]
    if not statuses:
        return None

    drawing = Drawing(460, 220)
    chart = VerticalBarChart()
    chart.x, chart.y = 50, 30
    chart.width, chart.height = 330, 160
    chart.data = [[s["count"] for s in statuses]]
    chart.categoryAxis.categoryNames = [s["label"] for s in statuses]
    chart.categoryAxis.labels.fontSize = 8
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.bars[0].fillColor = CHART_AMBER
    drawing.add(chart)
    return drawing


def build_officer_report_pdf(data):
    """
    Render the officer report `data` dict (from reports.build_officer_report_data)
    into a formatted PDF and return it as an in-memory buffer, ready to be
    streamed back as a file download.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=1.8 * cm, rightMargin=1.8 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ReportTitle", parent=styles["Title"], fontSize=18)
    heading_style = ParagraphStyle(
        "ReportHeading", parent=styles["Heading2"], spaceBefore=14, spaceAfter=6,
        textColor=PRIMARY,
    )

    elements = [
        Paragraph("Smart PMB — Officer Report", title_style),
        Paragraph(
            f"Generated: {data['generated_at'].strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        ),
        Spacer(1, 10),
        Paragraph("Warehouse Stock", heading_style),
        _table(
            [["Warehouse", "District", "Current stock (kg)", "Capacity (kg)", "Status"]]
            + _stock_rows(data)
        ),
    ]

    monthly_chart = _monthly_purchases_chart(data)
    if monthly_chart is not None:
        elements += [Spacer(1, 10), Paragraph("Purchases by Month", heading_style), monthly_chart]

    grade_chart = _grade_distribution_chart(data)
    if grade_chart is not None:
        elements += [Spacer(1, 10), Paragraph("Grade Distribution", heading_style), grade_chart]

    payment_chart = _payment_status_chart(data)
    if payment_chart is not None:
        elements += [Spacer(1, 10), Paragraph("Payment Status", heading_style), payment_chart]

    elements += [
        Spacer(1, 10),
        Paragraph(
            f"Recent Transactions (most recent {min(len(data['transaction_report']), MAX_TRANSACTION_ROWS)} shown)",
            heading_style,
        ),
        _table(
            [["Date", "Farmer", "Paddy type", "Warehouse", "Quantity (kg)", "Amount", "Status"]]
            + _transaction_rows(data),
        ),
    ]

    # _watermark is registered as the per-page draw hook so the faded logo
    # appears behind the content on every page of the document.
    doc.build(elements, onFirstPage=_watermark, onLaterPages=_watermark)
    buffer.seek(0)  # rewind so the caller can read from the start
    return buffer
