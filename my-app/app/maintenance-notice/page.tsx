/**
 * `/maintenance-notice` — shown to any logged-in, non-admin account when
 * maintenance_mode is on (see lib/dal.ts's getCurrentUser() and
 * sysops/middleware.py's MaintenanceModeMiddleware on the backend, which
 * is what actually enforces the lockout). Public/no-auth page — no point
 * gating a page whose whole purpose is to be reachable while locked out.
 * Deliberately not named /maintenance — that URL is already the admin-only
 * Maintenance manager page ((admin)/maintenance/page.tsx).
 */
import styles from "./Maintenance.module.css";

export default function MaintenancePage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Smart PMB is temporarily under maintenance</h1>
        <p className={styles.body}>
          We&apos;re making some changes and will be back shortly. Please
          check back again soon — no action is needed on your part.
        </p>
      </div>
    </div>
  );
}
