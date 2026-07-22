/**
 * Landing page at `/dashboard` for admin/officer users. Renders a different
 * dashboard depending on the logged-in user's permissions:
 *  - `manage_users` -> full admin overview panel
 *  - `monitor_operations` (without manage_users) -> officer panel
 *  - neither -> generic fallback dashboard (e.g. for roles with only
 *    narrow permissions like record_purchases)
 */
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_OFFICER_DASHBOARD } from "@/app/lib/previewSampleData";
import AdminOverviewPanel from "./AdminOverviewPanel";
import GenericDashboard from "./GenericDashboard";
import OfficerDashboardPanel from "./OfficerDashboardPanel";

/**
 * Server Component that decides which dashboard variant to show based on
 * the current user's permissions, fetches the matching data from the
 * Django backend, and renders the corresponding panel(s).
 */
export default async function DashboardPage() {
  const user = await requireUser();

  // Admin panel takes priority over the officer panel when a user happens
  // to have both permissions (e.g. a super-admin role).
  const showAdminPanel = user.permissions.includes("manage_users");
  const showOfficerPanel = !showAdminPanel && user.permissions.includes("monitor_operations");

  // No relevant permission at all — show the generic dashboard immediately
  // without hitting the admin/officer-only endpoints.
  if (!showOfficerPanel && !showAdminPanel) {
    return <GenericDashboard />;
  }

  // Preview never fetches real data — see previewSampleData.ts. Portal
  // Preview never offers the Admin role itself (the admin is the one doing
  // the previewing), so only the officer sample dashboard is needed here.
  if (user.previewing) {
    return showOfficerPanel ? (
      <OfficerDashboardPanel data={PREVIEW_OFFICER_DASHBOARD} />
    ) : (
      <GenericDashboard />
    );
  }

  // Only fetch the endpoint(s) relevant to this user's role; run them in
  // parallel since they're independent requests.
  const [officerRes, overviewRes] = await Promise.all([
    showOfficerPanel ? apiFetch("/api/officer/dashboard/") : null,
    showAdminPanel ? apiFetch("/api/admin/overview/") : null,
  ]);

  const officerData = officerRes?.ok ? await officerRes.json() : null;
  const overviewData = overviewRes?.ok ? await overviewRes.json() : null;

  // Fall back to the generic dashboard if the backend request(s) failed.
  if (!officerData && !overviewData) {
    return <GenericDashboard />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {overviewData && <AdminOverviewPanel data={overviewData} />}
      {officerData && <OfficerDashboardPanel data={officerData} />}
    </div>
  );
}
