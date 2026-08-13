/**
 * `/partner` — the partner portal's dashboard (authorized purchasers and
 * mill owners). Only reached once the account's LicenseApplication is
 * approved, or there's no application at all (see partner/layout.tsx —
 * that's an admin-created account, or an admin using Portal Preview). The
 * License card only renders when there's actual application data to show —
 * that's the one-time account-approval gate (accounts/models.py's
 * LicenseApplication). Below it, a role-specific panel shows the ongoing
 * business data: mill owners get their operating License history +
 * milling reports (mills app), purchasers get their stock + rice requests
 * (purchases app). Preview never fetches real data, same as messages/bell.
 */
import { FileDown } from "lucide-react";
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MillOwnerPanel from "./MillOwnerPanel";
import PurchaserPanel from "./PurchaserPanel";
import styles from "./PartnerDashboard.module.css";

export default async function PartnerDashboardPage() {
  const user = await requirePermission("view_dashboard");
  const hasApplication = user.licenseStatus !== null;

  const millData =
    !user.previewing && user.role === "mill_owner"
      ? await apiFetch("/api/mill-owner/dashboard/").then((res) => (res.ok ? res.json() : null))
      : null;
  const purchaserData =
    !user.previewing && user.role === "authorized_purchaser"
      ? await apiFetch("/api/purchaser/dashboard/").then((res) => (res.ok ? res.json() : null))
      : null;
  // Guaranteed prices — neither dashboard endpoint above returns these, so
  // fetched separately here and passed to whichever panel renders below.
  const paddyTypes =
    !user.previewing && (millData || purchaserData)
      ? await apiFetch("/api/admin/paddy-types/").then((res) => (res.ok ? res.json() : []))
      : [];

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
          {user.licenseNumber && (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>License number</span>
                <span className={styles.detailValue}>{user.licenseNumber}</span>
              </div>
              <a href="/api/licenses/certificate" className={styles.certificateLink}>
                <FileDown size={15} /> Download digital license certificate
              </a>
            </>
          )}
        </div>
      )}

      {millData && <MillOwnerPanel data={millData} paddyTypes={paddyTypes} />}
      {purchaserData && <PurchaserPanel data={purchaserData} paddyTypes={paddyTypes} />}
      {user.previewing && (
        <p className={styles.subtitle}>Business data isn&apos;t available while previewing.</p>
      )}
    </div>
  );
}
