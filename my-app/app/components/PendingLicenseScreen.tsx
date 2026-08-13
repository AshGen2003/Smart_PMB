/**
 * Holding screen shown by mill-owner/layout.tsx and purchaser/layout.tsx
 * instead of the real shell whenever a licensing application isn't
 * approved yet — the account exists and can log in, but there's nothing to
 * navigate to until an officer/admin reviews it (see
 * accounts.LicenseApplication / LicenseApplicationViewSet).
 */
"use client";

import Image from "next/image";
import { useActionState } from "react";
import clsx from "clsx";
import { logout } from "@/app/actions/auth";
import AuthShell from "@/app/(auth)/AuthShell";
import styles from "@/app/(auth)/AuthForm.module.css";

const initialUploadState: { error?: string } = {};

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
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadLicenseApplicationDocument,
    initialUploadState
  );

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

        {!rejected && (
          <form action={uploadAction} className={styles.field}>
            <label className={styles.label} htmlFor="document">
              Supporting business document <span className={styles.optional}>(optional)</span>
            </label>
            {uploadState.error && <div className={clsx(styles.banner, styles.bannerError)}>{uploadState.error}</div>}
            <input id="document" name="document" type="file" className={styles.input} />
            <button type="submit" className={styles.submitBtn} disabled={uploadPending}>
              {uploadPending ? "Uploading…" : "Upload document"}
            </button>
          </form>
        )}

        <form action={logout}>
          <button type="submit" className={styles.submitBtn}>
            Log out
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
