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
 * Verifies the visitor is logged in and not a farmer/driver, then wraps
 * the page content in the AdminShell (sidebar + header). Farmers/drivers
 * are redirected to their own portal since this layout is only for
 * admin/officer roles.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireUser() reads the JWT from the httpOnly cookie server-side and
  // redirects to /login if there is no valid session.
  const user = await requireUser();

  // Farmers/drivers/partners have their own portal/shell (see
  // app/farmer/layout.tsx, app/driver/layout.tsx, app/partner/layout.tsx) —
  // bounce them out of the admin area if they land here directly (including
  // via Portal Preview, since `user.role` reflects the previewed role while
  // previewing).
  if (user.role === "farmer") {
    redirect("/farmer");
  }
  if (user.role === "driver") {
    redirect("/driver");
  }
  if (user.role === "authorized_purchaser" || user.role === "mill_owner") {
    redirect("/partner");
  }

  // An admin-set (or admin-reset) temporary password must be changed before
  // this account reaches any real page — see accounts/views.py's
  // AdminUserWriteSerializer and the /change-password page.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  // Global system config (idle-logout timeout, maintenance mode banner) —
  // profile picture/notification prefs come from `user` itself now
  // (requireUser() already fetched them along with role/permissions, see
  // lib/dal.ts), rather than this layout re-fetching /api/auth/me/ again.
  const configRes = await apiFetch("/api/admin/system-config/");
  const config = configRes.ok ? await configRes.json() : null;

  return (
    <AdminShell
      userName={user.fullName ?? user.email}
      roleLabel={user.roleName}
      permissions={user.permissions}
      profilePictureUrl={user.profilePictureUrl}
      notifyMessages={user.notifyMessages}
      idleMinutes={config?.idle_logout_minutes}
      maintenanceMode={config?.maintenance_mode ?? false}
      previewing={user.previewing}
    >
      {children}
    </AdminShell>
  );
}
