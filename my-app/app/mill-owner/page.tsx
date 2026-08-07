/**
 * `/mill-owner` — the mill owner portal's dashboard. Only reached once the
 * account's LicenseApplication is approved, or there's no application at
 * all (see mill-owner/layout.tsx — that's an admin-created account, or an
 * admin using Portal Preview). The License card only renders when there's
 * actual application data to show — that's the one-time account-approval
 * gate (accounts/models.py's LicenseApplication). Below it, MillOwnerPanel
 * shows the ongoing business data: operating License history + milling
 * reports (mills app). Preview never fetches real data, same as
 * messages/bell.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MillOwnerPanel from "./MillOwnerPanel";
import styles from "./MillOwnerDashboard.module.css";

export default async function MillOwnerDashboardPage() {
  const user = await requirePermission("view_dashboard");
  const hasApplication = user.licenseStatus !== null;

  const millData = !user.previewing
    ? await apiFetch("/api/mill-owner/dashboard/").then((res) => (res.ok ? res.json() : null))
    : null;

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

      {millData && <MillOwnerPanel data={millData} />}
      {user.previewing && (
        <p className={styles.subtitle}>Business data isn&apos;t available while previewing.</p>
      )}
    </div>
  );
}
