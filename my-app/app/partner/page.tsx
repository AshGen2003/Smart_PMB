/**
 * `/partner` — the partner portal's dashboard (authorized purchasers and
 * mill owners). Only reached once the account's LicenseApplication is
 * approved, or there's no application at all (see partner/layout.tsx —
 * that's an admin-created account, or an admin using Portal Preview). The
 * License card only renders when there's actual application data to show;
 * no purchase/mill-specific business features exist yet, so this just
 * confirms the license itself — Messages is where they'd reach an officer
 * for anything further.
 */
import { requirePermission } from "@/app/lib/dal";
import styles from "./PartnerDashboard.module.css";

export default async function PartnerDashboardPage() {
  const user = await requirePermission("view_dashboard");
  const hasApplication = user.licenseStatus !== null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome, {user.fullName ?? user.email}</h1>
        <p className={styles.subtitle}>Your licensing status with Smart PMB.</p>
      </div>

      {hasApplication && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>License</h2>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Business name</span>
            <span className={styles.detailValue}>{user.licenseBusinessName}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>License type</span>
            <span className={styles.detailValue}>{user.licenseTypeDisplay}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.statusBadge}>Approved</span>
          </div>
        </div>
      )}
    </div>
  );
}
