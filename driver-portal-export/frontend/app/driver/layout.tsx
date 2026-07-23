/**
 * Shared layout for the driver-facing portal (dashboard, vehicle log,
 * messages, settings). Every page under `app/driver/` is rendered as
 * `children` inside this layout, wrapped in DriverShell (driver sidebar/
 * header, distinct from AdminShell/FarmerShell).
 */
import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import DriverShell from "@/app/components/DriverShell";

/**
 * Verifies the visitor is logged in with the "driver" role (redirects
 * otherwise), fetches their profile for the avatar, and renders the
 * DriverShell around the page content.
 */
export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("driver");

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <DriverShell
      userName={user.fullName ?? user.email}
      profilePictureUrl={me?.profile_picture ?? null}
      previewing={user.previewing}
    >
      {children}
    </DriverShell>
  );
}
