/**
 * Persistent banner shown on every page while an admin is genuinely
 * impersonating another user (see app/actions/impersonation.ts) — a real
 * session swap, not read-only sample data like Portal Preview
 * (PreviewBanner.tsx). Uses a distinct warning color so it's never
 * mistaken for that lighter-weight preview banner. Mounted by every portal
 * shell, since impersonating a non-admin user lands the admin in that
 * user's real portal, not the admin shell.
 *
 * Also pops a one-shot warning modal the moment impersonation starts,
 * signaled by a `?impersonation=started` query flag startImpersonation()
 * appends to its redirect — the banner covers "this is still going on,"
 * the modal makes sure the admin actually registers "this just happened
 * and it's a real account, not a preview" before doing anything else. The
 * flag is stripped from the URL right after so a refresh/back doesn't
 * re-trigger it.
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, UserCog } from "lucide-react";
import { stopImpersonation } from "@/app/actions/impersonation";
import styles from "./ImpersonationBanner.module.css";

/**
 * Wraps the actual banner in Suspense because it reads `useSearchParams()`
 * (to detect the `?impersonation=started` flag), which requires a
 * Suspense boundary during static rendering — same reasoning as
 * (auth)/login/LoginForm.tsx.
 */
export default function ImpersonationBanner({ adminEmail }: { adminEmail: string }) {
  return (
    <Suspense fallback={null}>
      <ImpersonationBannerInner adminEmail={adminEmail} />
    </Suspense>
  );
}

function ImpersonationBannerInner({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Lazy initializer reads the flag once, on first render — no setState-
  // in-effect needed just to decide whether to show it.
  const [showWarning, setShowWarning] = useState(
    () => searchParams.get("impersonation") === "started"
  );
  const impersonatedEmail = searchParams.get("as");

  useEffect(() => {
    if (searchParams.get("impersonation") !== "started") return;
    const params = new URLSearchParams(searchParams);
    params.delete("impersonation");
    params.delete("as");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return (
    <>
      <div className={styles.banner}>
        <span className={styles.label}>
          <UserCog size={15} />
          You&apos;re impersonating this account — signed in for real as <strong>{adminEmail}</strong>
        </span>
        <form action={stopImpersonation}>
          <button type="submit" className={styles.exitBtn}>
            Return to my account
          </button>
        </form>
      </div>

      {showWarning && (
        <div className={styles.overlay} onClick={() => setShowWarning(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertTriangle size={22} />
              <h2 className={styles.modalTitle}>You&apos;re now impersonating a real account</h2>
            </div>
            <div className={styles.modalBody}>
              <p>
                You are signed in as{" "}
                <strong>{impersonatedEmail || "this account"}</strong> — this is
                their <strong>real, live account</strong>, not a preview. Anything
                you view, send, or change happens for real, on their behalf.
              </p>
              <p>
                Use <strong>Return to my account</strong> in the banner above when
                you&apos;re done. This action has been logged.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.acknowledgeBtn}
                onClick={() => setShowWarning(false)}
                autoFocus
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
