# Renders the downloadable operating-license certificate PDF for an
# approved mills.License (the mill's ongoing, renewable, officer-issued
# operating license — distinct from accounts.pdf's certificate for the
# one-time account-approval LicenseApplication). Same reportlab/QR/watermark
# pattern as accounts/pdf.py so the two certificate styles read as the same
# product.
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


def _qr_image(license_obj):
    """Builds an in-memory QR code encoding the certificate's key facts, for a scan-to-verify glance — no server round trip needed."""
    payload = (
        f"Smart PMB Mill Operating License\n"
        f"No: {license_obj.license_no}\n"
        f"Mill: {license_obj.mill.mill_name}\n"
        f"Type: {license_obj.get_milling_type_display()}\n"
        f"Issued: {license_obj.issued_date:%Y-%m-%d}\n"
        f"Expires: {license_obj.expiry_date:%Y-%m-%d}"
    )
    img = qrcode.make(payload)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def build_mill_license_certificate_pdf(license_obj):
    """
    Render `license_obj` (an approved mills.License) as a formatted
    operating-license certificate PDF and return it as an in-memory buffer,
    ready to be streamed back as a file download. Caller is responsible for
    checking license_obj.status == APPROVED and license_obj.license_no is
    set before calling this — this function trusts both are already true.
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

    mill = license_obj.mill
    elements = [
        Paragraph("Smart PMB", title_style),
        Paragraph("Mill Operating License Certificate", subtitle_style),
        Spacer(1, 10),
        Paragraph("This certifies that", body_style),
        Paragraph(mill.mill_name, name_style),
        Paragraph(
            f"is licensed to operate a <b>{license_obj.get_milling_type_display()}</b> rice mill "
            "under the Smart PMB paddy marketing system.",
            body_style,
        ),
        Paragraph(f"License No. {license_obj.license_no}", number_style),
        _qr_image_table(license_obj),
        Spacer(1, 24),
        _table(
            [
                ["Owner", mill.owner_name],
                ["Mill registration no.", mill.registration_no],
                ["Premises address", license_obj.premises_address or "—"],
                [
                    "Requested capacity",
                    f"{license_obj.requested_capacity_mt_per_day} MT/day" if license_obj.requested_capacity_mt_per_day else "—",
                ],
                ["Issued on", license_obj.issued_date.strftime("%Y-%m-%d") if license_obj.issued_date else "—"],
                ["Valid until", license_obj.expiry_date.strftime("%Y-%m-%d") if license_obj.expiry_date else "—"],
                ["Issued by", license_obj.reviewed_by.full_name if license_obj.reviewed_by else "—"],
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


def _qr_image_table(license_obj):
    """Centers the QR code on the page using a borderless single-cell table (reportlab has no native block-center for Image flowables)."""
    qr = _qr_image(license_obj)
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
