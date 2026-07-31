/**
 * Shared layout for the `(admin)` route group — every admin/officer page
 * (dashboard, approvals, warehouses, reports, etc.) is rendered as `children`
 * inside this layout. This is a Server Component: it runs on the server for
 * every request in this route group, so it's a good place to gate access and
 * fetch data shared by all admin pages (current user, profile picture,
 * system config) before rendering the Sidebar/header shell.
 *
 * Because this is a route group (parentheses in the folder name), `(admin)`
 * does NOT appear in the URL — e.g. `(admin)/dashboard/page.tsx` is served at
 * `/dashboard`, not `/(admin)/dashboard`.
 */
import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import AdminShell from "@/app/components/AdminShell";

/**
 * Verifies the visitor is logged in and not a farmer/mill owner/driver,
 * then wraps the page content in the AdminShell (sidebar + header).
 * Farmers, mill owners, and drivers are redirected to their own portals
 * since this layout is only for admin/officer roles.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireUser() reads the JWT from the httpOnly cookie server-side and
  // redirects to /login if there is no valid session.
  const user = await requireUser();

  // Farmers/mill owners/drivers have their own portal/shell (see
  // app/farmer/layout.tsx, app/mill-owner/layout.tsx, app/driver/layout.tsx)
  // — bounce them out of the admin area if they land here directly
  // (including via Portal Preview, since `user.role` reflects the
  // previewed role while previewing).
  if (user.role === "farmer") {
    redirect("/farmer");
  }
  if (user.role === "mill_owner") {
    redirect("/mill-owner");
  }
  if (user.role === "driver") {
    redirect("/driver");
  }

  // Fetch the current user's profile (for the avatar image) and the global
  // system config (idle-logout timeout, maintenance mode banner) in
  // parallel since neither depends on the other.
  const [meRes, configRes] = await Promise.all([
    apiFetch("/api/auth/me/"),
    apiFetch("/api/admin/system-config/"),
  ]);
  const me = meRes.ok ? await meRes.json() : null;
  const config = configRes.ok ? await configRes.json() : null;

  return (
    <AdminShell
      userName={user.fullName ?? user.email}
      roleLabel={user.roleName}
      permissions={user.permissions}
      profilePictureUrl={me?.profile_picture ?? null}
      idleMinutes={config?.idle_logout_minutes}
      maintenanceMode={config?.maintenance_mode ?? false}
      previewing={user.previewing}
    >
      {children}
    </AdminShell>
  );
}
