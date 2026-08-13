# Renders the downloadable "digital license" certificate for an approved
# LicenseApplication (authorized purchaser or mill owner). System-generated
# from the application's own data via reportlab — same watermark/color
# helpers as sysops.pdf and farmers.pdf, so it matches the rest of the app's
# PDF output, plus a QR code (via the `qrcode` package, same as the lot
# traceability feature in farmers/views.py) encoding the certificate's own
# details for a quick scan-to-verify glance.
import io

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from sysops.pdf import PRIMARY, _watermark

GOLD = colors.HexColor("#b45309")
BORDER = colors.HexColor("#15803d")


def _qr_image(application):
    """Builds an in-memory QR code encoding the certificate's key facts, for a scan-to-verify glance — no server round trip needed."""
    payload = (
        f"Smart PMB Digital License\n"
        f"No: {application.license_number}\n"
        f"Holder: {application.business_name}\n"
        f"Type: {application.get_license_type_display()}\n"
        f"Issued: {application.reviewed_at:%Y-%m-%d}"
    )
    img = qrcode.make(payload)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def build_license_certificate_pdf(application):
    """
    Render `application` (an approved accounts.LicenseApplication) as a
    formatted certificate PDF and return it as an in-memory buffer, ready to
    be streamed back as a file download. Caller is responsible for checking
    application.status == APPROVED and application.license_number is set
    before calling this — this function trusts both are already true.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=3 * cm, bottomMargin=3 * cm,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle", parent=styles["Title"], fontSize=24, textColor=PRIMARY,
        alignment=TA_CENTER, spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle", parent=styles["Normal"], fontSize=11, textColor=colors.grey,
        alignment=TA_CENTER, spaceAfter=18,
    )
    body_style = ParagraphStyle(
        "CertBody", parent=styles["Normal"], fontSize=12, alignment=TA_CENTER, spaceAfter=6,
    )
    number_style = ParagraphStyle(
        "CertNumber", parent=styles["Normal"], fontSize=14, textColor=GOLD,
        alignment=TA_CENTER, spaceBefore=10, spaceAfter=18,
    )
    name_style = ParagraphStyle(
        "CertName", parent=styles["Title"], fontSize=20, alignment=TA_CENTER, spaceAfter=4,
    )

    elements = [
        Paragraph("Smart PMB", title_style),
        Paragraph("Digital License Certificate", subtitle_style),
        Spacer(1, 10),
        Paragraph("This certifies that", body_style),
        Paragraph(application.business_name, name_style),
        Paragraph(
            f"is licensed as a <b>{application.get_license_type_display()}</b> "
            "under the Smart PMB paddy marketing system.",
            body_style,
        ),
        Paragraph(f"License No. {application.license_number}", number_style),
        _qr_image_table(application),
        Spacer(1, 24),
        _table(
            [
                ["Applicant", application.user.full_name or application.user.email],
                ["Business registration no.", application.business_registration_no],
                ["Contact number", application.contact_number or "—"],
                ["Issued on", application.reviewed_at.strftime("%Y-%m-%d") if application.reviewed_at else "—"],
                ["Issued by", application.reviewed_by.full_name if application.reviewed_by else "—"],
            ]
        ),
        Spacer(1, 30),
        Paragraph(
            "This certificate is generated and issued electronically by the Smart PMB "
            "system and is valid without a physical signature. Scan the QR code above "
            "to verify its details.",
            ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey, alignment=TA_CENTER),
        ),
    ]

    def _border(canvas_obj, doc_):
        _watermark(canvas_obj, doc_)
        canvas_obj.saveState()
        canvas_obj.setStrokeColor(BORDER)
        canvas_obj.setLineWidth(2)
        margin = 1.2 * cm
        canvas_obj.rect(
            margin, margin,
            doc_.pagesize[0] - 2 * margin, doc_.pagesize[1] - 2 * margin,
        )
        canvas_obj.restoreState()

    doc.build(elements, onFirstPage=_border, onLaterPages=_border)
    buffer.seek(0)
    return buffer


def _qr_image_table(application):
    """Centers the QR code on the page using a borderless single-cell table (reportlab has no native block-center for Image flowables)."""
    qr = _qr_image(application)
    qr_flowable = RLImage(qr, width=2.8 * cm, height=2.8 * cm)
    table = Table([[qr_flowable]], colWidths=[doc_width()])
    table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    return table


def doc_width():
    # A4 width minus the certificate's own left/right margins (2.5cm each).
    return A4[0] - 5 * cm


def _table(rows):
    """Two-column key/value table for the certificate's detail block, styled distinctly from the striped report tables elsewhere."""
    table = Table(rows, colWidths=[doc_width() * 0.42, doc_width() * 0.58])
    table.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "LEFT"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#e5e5e5")),
            ]
        )
    )
    return table
