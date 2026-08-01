/**
 * Shared layout for the driver-facing portal (dashboard, vehicle log,
 * messages, settings). Every page under `app/driver/` is rendered as
 * `children` inside this layout, wrapped in DriverShell (driver sidebar/
 * header, distinct from AdminShell/FarmerShell).
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/app/lib/dal";
import DriverShell from "@/app/components/DriverShell";

/**
 * Verifies the visitor is logged in with the "driver" role (redirects
 * otherwise) and renders the DriverShell around the page content. Profile
 * picture/notification prefs come straight off `user` — requireRole()
 * already fetched them along with role/permissions (see lib/dal.ts), so
 * there's no need for this layout to fetch /api/auth/me/ again itself.
 */
export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("driver");

  // An admin-set (or admin-reset) temporary password must be changed before
  // this account reaches any real page.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <DriverShell
      userName={user.fullName ?? user.email}
      permissions={user.permissions}
      profilePictureUrl={user.profilePictureUrl}
      notifyMessages={user.notifyMessages}
      previewing={user.previewing}
    >
      {children}
    </DriverShell>
  );
}
