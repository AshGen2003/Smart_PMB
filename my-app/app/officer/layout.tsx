/**
 * Shared layout for the dedicated PMB Officer portal (`app/officer/`) —
 * every page under it is rendered as `children` inside this layout,
 * wrapped in OfficerShell. Mirrors (admin)/layout.tsx's data-fetching
 * (system config, unread-message/pending-request counts for the sidebar's
 * red dots), gated by "access_pmb_officer_portal" (see accounts/migrations/
 * 0034) rather than "anyone who isn't farmer/driver/etc" — admins still
 * manage the system from the shared `(admin)` shell, they don't get a view
 * of this portal. Same access_<role>_portal convention migrations 0032/
 * 0033 already applied to the other five portals.
 *
 * Portal Preview CAN reach this layout: entering preview redirects to
 * /dashboard, and (admin)/layout.tsx's `pmb_officer` redirect (which
 * fires for the previewed role same as it does for the real one) sends
 * that request straight here — see OfficerShell.tsx's docstring. So the
 * real-data fetches below are skipped while previewing, same as
 * (admin)/layout.tsx does for its own equivalents.
 */
import { redirect } from "next/navigation";
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import OfficerShell from "@/app/components/OfficerShell";

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePermission("access_pmb_officer_portal");

  // An admin-set (or admin-reset) temporary password must be changed
  // before this account reaches any real page.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  const configRes = await apiFetch("/api/admin/system-config/");
  const config = configRes.ok ? await configRes.json() : null;

  // Red-dot counts for the sidebar's Messages/My Requests/Licenses nav
  // items — same computation as (admin)/layout.tsx, skipped during Portal
  // Preview (the previewed role's inbox/requests have no meaning for the
  // real admin's own JWT-authenticated account underneath).
  const [inboxRes, systemRequestsRes, licenseApplicationsRes] = await Promise.all([
    !user.previewing && user.notifyMessages ? apiFetch("/api/messages/inbox/") : null,
    !user.previewing && user.permissions.includes("request_system_changes")
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
  const pendingRequestCount = systemRequests.filter((r) => r.status === "payment_pending").length;

  const pendingLicenseCount: number = licenseApplicationsRes?.ok
    ? (await licenseApplicationsRes.json()).length
    : 0;

  return (
    <OfficerShell
      permissions={user.permissions}
      notifyMessages={user.notifyMessages}
      idleMinutes={config?.idle_logout_minutes}
      maintenanceMode={config?.maintenance_mode ?? false}
      unreadMessageCount={unreadMessageCount}
      pendingRequestCount={pendingRequestCount}
      pendingLicenseCount={pendingLicenseCount}
      previewing={user.previewing}
      impersonating={user.impersonating}
    >
      {children}
    </OfficerShell>
  );
}
