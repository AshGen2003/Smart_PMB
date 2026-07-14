import io
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PRIMARY = colors.HexColor("#15803d")
GRID = colors.HexColor("#dddddd")
STRIPE = colors.HexColor("#f7f7f7")

LOGO_PATH = Path(__file__).resolve().parent / "assets" / "logo.png"
WATERMARK_ALPHA = 0.12
WATERMARK_BOX = 12 * cm

# Built once per process, not once per PDF — the faded copy never changes.
_watermark_image = None


def _get_watermark_image():
    global _watermark_image
    if _watermark_image is None:
        logo = Image.open(LOGO_PATH).convert("RGBA")
        r, g, b, a = logo.split()
        a = a.point(lambda p: int(p * WATERMARK_ALPHA))
        faded = Image.merge("RGBA", (r, g, b, a))
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
    scale = WATERMARK_BOX / max(iw, ih)
    w, h = iw * scale, ih * scale
    x = (doc.pagesize[0] - w) / 2
    y = (doc.pagesize[1] - h) / 2
    canvas_obj.drawImage(image, x, y, width=w, height=h, mask="auto")
    canvas_obj.restoreState()


def _table(rows, col_widths=None):
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


def build_admin_report_pdf(data):
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
        Spacer(1, 10),
        Paragraph("Security Activity (last 30 days)", heading_style),
        Paragraph(
            f"Successful logins: {data['security']['login_success']}  |  "
            f"Failed logins: {data['security']['login_failed']}  |  "
            f"Accounts locked: {data['security']['account_locked']}",
            styles["Normal"],
        ),
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

    doc.build(elements, onFirstPage=_watermark, onLaterPages=_watermark)
    buffer.seek(0)
    return buffer
