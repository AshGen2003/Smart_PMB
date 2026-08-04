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
 * Verifies the visitor is logged in and not a farmer/driver/PMB officer/
 * etc, then wraps the page content in the AdminShell (sidebar + header).
 * Those roles are redirected to their own portal since this layout is
 * only for admin (and, via Portal Preview, any role being previewed).
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
  if (user.role === "warehouse_manager") {
    redirect("/warehouse-manager");
  }
  if (user.role === "pmb_officer") {
    redirect("/officer");
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

  // Red-dot counts for the Sidebar's Messages/System Requests nav items —
  // fetched here (once per navigation) rather than polled client-side, to
  // avoid duplicating NotificationBell.tsx's own inbox polling. Preview
  // never fetches real data (see previewSampleData.ts's docstring), and
  // messages respects the same notifyMessages mute the bell already does.
  const [inboxRes, systemRequestsRes, licenseApplicationsRes] = await Promise.all([
    !user.previewing && user.notifyMessages ? apiFetch("/api/messages/inbox/") : null,
    !user.previewing &&
    (user.permissions.includes("manage_system_requests") ||
      user.permissions.includes("request_system_changes"))
      ? apiFetch("/api/system-requests/")
      : null,
    !user.previewing && user.permissions.includes("approve_licenses")
      ? apiFetch("/api/admin/license-applications/?status=pending")
      : null,
  ]);

  const inbox: { is_read: boolean }[] = inboxRes?.ok ? await inboxRes.json() : [];
  const unreadMessageCount = inbox.filter((m) => !m.is_read).length;

  const systemRequests: { status: string }[] = systemRequestsRes?.ok
    ? await systemRequestsRes.json()
    : [];
  // Admins see the count of new requests waiting for a decision; officers
  // see the count of accepted requests still awaiting their payment —
  // each audience's own "needs your attention" state.
  const pendingRequestCount = user.permissions.includes("manage_system_requests")
    ? systemRequests.filter((r) => r.status === "pending").length
    : systemRequests.filter((r) => r.status === "payment_pending").length;

  // Already filtered server-side (?status=pending), so the array length
  // alone is the count — new authorized-purchaser/mill-owner self-
  // registrations waiting for an officer/admin to review.
  const pendingLicenseCount: number = licenseApplicationsRes?.ok
    ? (await licenseApplicationsRes.json()).length
    : 0;

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
      impersonating={user.impersonating}
      unreadMessageCount={unreadMessageCount}
      pendingRequestCount={pendingRequestCount}
      pendingLicenseCount={pendingLicenseCount}
    >
      {children}
    </AdminShell>
  );
}
