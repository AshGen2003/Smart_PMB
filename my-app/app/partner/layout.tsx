/**
 * Shared layout for the partner-facing portal (authorized purchasers and
 * mill owners): dashboard, messages, settings. Every page under
 * `app/partner/` is rendered as `children` inside this layout — but only
 * once the account's LicenseApplication has been approved. `licenseStatus`
 * is `null` for two legitimate cases that should NOT be gated: an
 * admin-created purchaser/mill-owner account (no self-registration, so no
 * application exists at all — an admin creating the account directly is
 * already the approval), and an admin previewing this role via Portal
 * Preview (the real account being checked is the admin's own, which has no
 * application either). Only an actual pending/rejected application blocks
 * access.
 */
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/app/lib/dal";
import PartnerShell from "@/app/components/PartnerShell";
import PendingLicenseScreen from "./PendingLicenseScreen";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAnyRole("authorized_purchaser", "mill_owner");

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
    <PartnerShell
      userName={user.fullName ?? user.email}
      role={user.role as "authorized_purchaser" | "mill_owner"}
      permissions={user.permissions}
      profilePictureUrl={user.profilePictureUrl}
      notifyMessages={user.notifyMessages}
      previewing={user.previewing}
    >
      {children}
    </PartnerShell>
  );
}
