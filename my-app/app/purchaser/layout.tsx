/**
 * Layout for the authorized purchaser portal: dashboard, rice requests,
 * messages, settings. Every page under `app/purchaser/` is rendered as
 * `children` inside this layout — but only once the account's
 * LicenseApplication has been approved. `licenseStatus` is `null` for two
 * legitimate cases that should NOT be gated: an admin-created purchaser
 * account (no self-registration, so no application exists at all — an
 * admin creating the account directly is already the approval), and an
 * admin previewing this role via Portal Preview (the real account being
 * checked is the admin's own, which has no application either). Only an
 * actual pending/rejected application blocks access.
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/app/lib/dal";
import PurchaserShell from "@/app/components/PurchaserShell";
import PendingLicenseScreen from "@/app/components/PendingLicenseScreen";

export default async function PurchaserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("authorized_purchaser");

  // An admin-set (or admin-reset) temporary password must be changed before
  // this account reaches any real page.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  if (user.licenseStatus !== null && user.licenseStatus !== "approved") {
    return (
      <PendingLicenseScreen
        status={user.licenseStatus === "rejected" ? "rejected" : "pending"}
        businessName={user.licenseBusinessName}
        licenseTypeDisplay={user.licenseTypeDisplay}
        rejectionReason={user.licenseRejectionReason}
      />
    );
  }

  return (
    <PurchaserShell
      permissions={user.permissions}
      notifyMessages={user.notifyMessages}
      previewing={user.previewing}
      impersonating={user.impersonating}
    >
      {children}
    </PurchaserShell>
  );
}
