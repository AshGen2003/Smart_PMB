/**
 * `/purchaser/license` — the logged-in authorized purchaser's own digital
 * license certificate: business name, license type/number, and a download
 * link for the PDF (see accounts.MyLicenseCertificateView via
 * /api/licenses/certificate). By the time this renders, purchaser/layout.tsx
 * has already gated out anyone whose application isn't approved (or who has
 * no application at all — an admin-created account), so this only ever
 * shows the "approved" or "no application on file" states.
 */
import { getCurrentUser } from "@/app/lib/dal";
import LicenseCertificateCard from "./LicenseCertificateCard";
import styles from "./License.module.css";

export default async function PurchaserLicensePage() {
  const user = await getCurrentUser();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My License</h1>
          <span className={styles.subtitle}>Your Smart PMB digital license certificate</span>
        </div>
      </div>

      {user?.licenseStatus === "approved" ? (
        <LicenseCertificateCard
          businessName={user.licenseBusinessName}
          licenseTypeDisplay={user.licenseTypeDisplay}
          licenseNumber={user.licenseNumber}
        />
      ) : (
        <div className={styles.container}>
          <div className={styles.emptyState}>
            No license application is on file for this account. Contact your PMB officer if you believe this is a mistake.
          </div>
        </div>
      )}
    </div>
  );
}
