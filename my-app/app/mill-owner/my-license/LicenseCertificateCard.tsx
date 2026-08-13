/**
 * Certificate-styled summary card for an approved license: echoes the look
 * of the actual PDF (accounts/pdf.py's build_license_certificate_pdf) —
 * gold license number, centered layout, bordered frame — so the in-app
 * preview reads as "the same certificate" rather than a plain data table.
 * Pure presentation, no interactivity beyond the download link, so this
 * stays a Server Component.
 */
import { Award, Download } from "lucide-react";
import styles from "./License.module.css";

export default function LicenseCertificateCard({
  businessName,
  licenseTypeDisplay,
  licenseNumber,
}: {
  businessName: string;
  licenseTypeDisplay: string;
  licenseNumber: string | null;
}) {
  return (
    <div className={styles.certificateCard}>
      <div className={styles.certificateIcon}>
        <Award size={28} />
      </div>
      <div className={styles.certificateEyebrow}>Smart PMB Digital License Certificate</div>
      <div className={styles.certificateBusinessName}>{businessName}</div>
      <div className={styles.certificateType}>
        is licensed as a <strong>{licenseTypeDisplay}</strong> under the Smart PMB paddy marketing system.
      </div>
      {licenseNumber && <div className={styles.certificateNumber}>License No. {licenseNumber}</div>}

      <a href="/api/licenses/certificate" className={styles.downloadBtn}>
        <Download size={16} /> Download certificate (PDF)
      </a>
    </div>
  );
}
