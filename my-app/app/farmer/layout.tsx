/**
 * Shared layout for the farmer-facing portal (dashboard, profile,
 * settings). Every page under `app/farmer/` is rendered as `children`
 * inside this layout, wrapped in the FarmerShell (farmer sidebar/header,
 * distinct from the admin AdminShell).
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/app/lib/dal";
import FarmerShell from "@/app/components/FarmerShell";

/**
 * Verifies the visitor is logged in with the "farmer" role (redirects
 * otherwise — this is what keeps admins/officers out of the farmer portal
 * and vice versa) and renders the FarmerShell around the page content.
 * Profile picture/notification prefs come straight off `user` — requireRole()
 * already fetched them along with role/permissions (see lib/dal.ts), so
 * there's no need for this layout to fetch /api/auth/me/ again itself.
 */
export default async function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("farmer");

  // An admin-set (or admin-reset) temporary password must be changed before
  // this account reaches any real page.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <FarmerShell
      userName={user.fullName ?? user.email}
      permissions={user.permissions}
      profilePictureUrl={user.profilePictureUrl}
      notifyMessages={user.notifyMessages}
      previewing={user.previewing}
    >
      {children}
    </FarmerShell>
  );
}
