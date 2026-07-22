# Renders the "Admin Report" as a PDF using reportlab (document/table/chart
# layout) and Pillow (fading the Smart PMB logo into a translucent
# watermark). The actual report content comes from reports.py's
# build_admin_report_data(); this module is purely presentational.
import io
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.legends import Legend
from reportlab.graphics.shapes import Drawing
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PRIMARY = colors.HexColor("#15803d")
GRID = colors.HexColor("#dddddd")
STRIPE = colors.HexColor("#f7f7f7")

# Same fixed "neutral" chart palette as the web app's --chart-* CSS
# variables (globals.css), so a PDF chart and its on-screen counterpart
# use matching colors.
CHART_TEAL = colors.HexColor("#0d9488")
CHART_INDIGO = colors.HexColor("#6366f1")
CHART_AMBER = colors.HexColor("#f59e0b")
CHART_ROSE = colors.HexColor("#f43f5e")

LOGO_PATH = Path(__file__).resolve().parent / "assets" / "logo.png"
WATERMARK_ALPHA = 0.12  # 12% opacity — faint enough not to obscure the report text
WATERMARK_BOX = 12 * cm  # the watermark is scaled to fit within this square

# Built once per process, not once per PDF — the faded copy never changes.
_watermark_image = None


def _get_watermark_image():
    """
    Load the Smart PMB logo once, fade its alpha channel down to
    WATERMARK_ALPHA, and cache the result as a ReportLab ImageReader so
    every subsequent PDF page/report reuses the same in-memory faded copy
    instead of re-processing the image each time.
    """
    global _watermark_image
    if _watermark_image is None:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        # Split into channels and scale down only the alpha (transparency)
        # channel, so colors stay true but the image becomes translucent.
        r, g, b, a = logo.split()
        a = a.point(lambda p: int(p * WATERMARK_ALPHA))
        faded = Image.merge("RGBA", (r, g, b, a))
        # Re-encode as PNG in memory (reportlab needs a file-like image
        # source, not a raw PIL Image) so it can be drawn on the canvas.
        buffer = io.BytesIO()
        faded.save(buffer, format="PNG")
        buffer.seek(0)
        _watermark_image = ImageReader(buffer)
    return _watermark_image


def _watermark(canvas_obj, doc):
    # Drawn on every page via SimpleDocTemplate's onPage hook — the PMB
    # logo, faded via its alpha channel, centered behind the report content.
    canvas_obj.saveState()
    image = _get_watermark_image()
    iw, ih = image.getSize()
    # Scale proportionally so the logo's longer side fits WATERMARK_BOX,
    # then center it on the page behind the report content.
    scale = WATERMARK_BOX / max(iw, ih)
    w, h = iw * scale, ih * scale
    x = (doc.pagesize[0] - w) / 2
    y = (doc.pagesize[1] - h) / 2
    canvas_obj.drawImage(image, x, y, width=w, height=h, mask="auto")
    canvas_obj.restoreState()


def _table(rows, col_widths=None):
    """Build a styled reportlab Table: green header row, light grid lines, and alternating (striped) row backgrounds."""
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, GRID),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, STRIPE]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def _audit_rows(data):
    """Format the report's recent-audit entries into table rows, truncating long details and handling the empty case."""
    rows = [
        [
            a["created_at"].strftime("%Y-%m-%d %H:%M"),
            a["actor"],
            a["action"].replace("_", " "),
            a["module"],
            (a["details"] or "—")[:40],
        ]
        for a in data["recent_audit"]
    ]
    return rows or [["—", "—", "—", "—", "—"]]


def _auth_rows(data):
    """Format the report's recent-login entries into table rows, handling the empty case."""
    rows = [
        [
            l["created_at"].strftime("%Y-%m-%d %H:%M"),
            l["email"] or "—",
            l["action"].replace("_", " "),
            l["ip_address"] or "—",
        ]
        for l in data["recent_auth"]
    ]
    return rows or [["—", "—", "—", "—"]]


def _roles_bar_chart(data):
    """Grouped bar chart (users, permissions per role) matching the web report's "Users by Role" chart, or None if there are no roles to plot."""
    roles = data["roles"]
    if not roles:
        return None

    drawing = Drawing(460, 220)
    chart = VerticalBarChart()
    chart.x, chart.y = 50, 30
    chart.width, chart.height = 330, 160
    chart.data = [[r["user_count"] for r in roles], [r["permission_count"] for r in roles]]
    chart.categoryAxis.categoryNames = [r["name"] for r in roles]
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.dy = -10
    chart.categoryAxis.labels.fontSize = 6
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.barSpacing = 2
    chart.groupSpacing = 8
    chart.bars[0].fillColor = CHART_INDIGO
    chart.bars[1].fillColor = CHART_AMBER
    drawing.add(chart)

    legend = Legend()
    legend.x, legend.y = 400, 170
    legend.dx, legend.dy = 8, 8
    legend.fontSize = 7
    legend.alignment = "right"
    legend.colorNamePairs = [(CHART_INDIGO, "Users"), (CHART_AMBER, "Permissions")]
    drawing.add(legend)
    return drawing


def _login_trend_chart(data):
    """Line chart of daily successful/failed logins matching the web report's login-activity chart, or None if there's no trend data."""
    trend = data["login_activity_trend"]
    if not trend:
        return None

    drawing = Drawing(460, 220)
    chart = HorizontalLineChart()
    chart.x, chart.y = 50, 30
    chart.width, chart.height = 330, 160
    chart.data = [[t["success"] for t in trend], [t["failed"] for t in trend]]
    chart.categoryAxis.categoryNames = [t["date"] for t in trend]
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.dy = -10
    chart.categoryAxis.labels.fontSize = 6
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    chart.lines[0].strokeColor = CHART_TEAL
    chart.lines[1].strokeColor = CHART_ROSE
    chart.lines[0].strokeWidth = 1.5
    chart.lines[1].strokeWidth = 1.5
    drawing.add(chart)

    legend = Legend()
    legend.x, legend.y = 400, 170
    legend.dx, legend.dy = 8, 8
    legend.fontSize = 7
    legend.alignment = "right"
    legend.colorNamePairs = [(CHART_TEAL, "Successful logins"), (CHART_ROSE, "Failed logins")]
    drawing.add(legend)
    return drawing


def build_admin_report_pdf(data):
    """
    Render the admin report `data` dict (from reports.build_admin_report_data)
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
        Paragraph("Smart PMB — Admin Report", title_style),
        Paragraph(
            f"Generated: {data['generated_at'].strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        ),
        Spacer(1, 10),
        Paragraph("Users &amp; Roles", heading_style),
        Paragraph(
            f"Total users: {data['users']['total']}  |  Active: {data['users']['active']}",
            styles["Normal"],
        ),
        Spacer(1, 6),
        _table(
            [["Role", "Users", "Permissions"]]
            + [
                [r["name"], str(r["user_count"]), str(r["permission_count"])]
                for r in data["roles"]
            ]
        ),
    ]

    roles_chart = _roles_bar_chart(data)
    if roles_chart is not None:
        elements += [Spacer(1, 10), roles_chart]

    elements += [
        Spacer(1, 10),
        Paragraph("Security Activity (last 30 days)", heading_style),
        Paragraph(
            f"Successful logins: {data['security']['login_success']}  |  "
            f"Failed logins: {data['security']['login_failed']}  |  "
            f"Accounts locked: {data['security']['account_locked']}",
            styles["Normal"],
        ),
    ]

    login_chart = _login_trend_chart(data)
    if login_chart is not None:
        elements += [Spacer(1, 10), login_chart]

    elements += [
        Spacer(1, 10),
        Paragraph("Recent Audit Log", heading_style),
        _table([["When", "Actor", "Action", "Module", "Details"]] + _audit_rows(data)),
        Spacer(1, 10),
        Paragraph("Recent Login Activity", heading_style),
        _table([["When", "Email", "Action", "IP Address"]] + _auth_rows(data)),
        Spacer(1, 10),
        Paragraph("Backups", heading_style),
    ]

    backups = data["backups"]
    last = backups["last"]
    last_str = (
        f"{last['created_at'].strftime('%Y-%m-%d %H:%M')} ({last['status']})"
        if last
        else "None yet"
    )
    elements.append(
        Paragraph(
            f"Total: {backups['total']}  |  Completed: {backups['completed']}  |  "
            f"Failed: {backups['failed']}  |  Last backup: {last_str}",
            styles["Normal"],
        )
    )

    # _watermark is registered as the per-page draw hook so the faded logo
    # appears behind the content on every page of the document.
    doc.build(elements, onFirstPage=_watermark, onLaterPages=_watermark)
    buffer.seek(0)  # rewind so the caller can read from the start
    return buffer
