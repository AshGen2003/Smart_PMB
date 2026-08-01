/**
 * Holding screen shown by partner/layout.tsx instead of the real PartnerShell
 * whenever a licensing application isn't approved yet — the account exists
 * and can log in, but there's nothing to navigate to until an officer/admin
 * reviews it (see accounts.LicenseApplication / LicenseApplicationViewSet).
 */
import Image from "next/image";
import clsx from "clsx";
import { logout } from "@/app/actions/auth";
import AuthShell from "../(auth)/AuthShell";
import styles from "../(auth)/AuthForm.module.css";

export default function PendingLicenseScreen({
  status,
  businessName,
  licenseTypeDisplay,
  rejectionReason,
}: {
  status: "pending" | "rejected";
  businessName: string;
  licenseTypeDisplay: string;
  rejectionReason: string;
}) {
  const rejected = status === "rejected";

  return (
    <AuthShell>
      <div className={styles.card}>
        <div className={styles.mobileLogoRow}>
          <Image src="/logo.png" alt="" width={28} height={28} />
          <span>Smart PMB</span>
        </div>

        <h1 className={styles.title}>
          {rejected ? "Application not approved" : "Application under review"}
        </h1>
        <p className={styles.subtitle}>
          {businessName} — {licenseTypeDisplay}
        </p>

        <div className={clsx(styles.banner, rejected ? styles.bannerError : styles.bannerInfo)}>
          {rejected ? (
            <>
              Your application was not approved.
              {rejectionReason && (
                <>
                  <br />
                  <strong>Reason:</strong> {rejectionReason}
                </>
              )}
              <br />
              Contact the PMB office directly if you believe this is a mistake.
            </>
          ) : (
            "An officer is reviewing your application. You'll get an email as soon as a decision is made — there's nothing else to do in the meantime."
          )}
        </div>

        <form action={logout}>
          <button type="submit" className={styles.submitBtn}>
            Log out
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
