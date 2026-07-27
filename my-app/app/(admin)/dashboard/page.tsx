/**
 * Landing page at `/dashboard` for admin/officer users. Renders a different
 * dashboard depending on the logged-in user's permissions:
 *  - `manage_users` -> full admin overview panel
 *  - `monitor_operations` (without manage_users) -> officer panel
 *  - `record_purchases` only (no manage_users/monitor_operations) ->
 *    dedicated Authorized Purchaser panel (their own stock + rice requests)
 *  - none of the above -> generic fallback dashboard
 */
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_OFFICER_DASHBOARD } from "@/app/lib/previewSampleData";
import AdminOverviewPanel from "./AdminOverviewPanel";
import GenericDashboard from "./GenericDashboard";
import OfficerDashboardPanel from "./OfficerDashboardPanel";
import PurchaserDashboardPanel from "./PurchaserDashboardPanel";

/**
 * Server Component that decides which dashboard variant to show based on
 * the current user's permissions, fetches the matching data from the
 * Django backend, and renders the corresponding panel(s).
 */
export default async function DashboardPage() {
  const user = await requireUser();

  // Admin panel takes priority over the officer panel when a user happens
  // to have both permissions (e.g. a super-admin role). A pure
  // record_purchases holder (no monitor_operations) is an Authorized
  // Purchaser and gets their own dedicated panel instead of the officer one.
  const showAdminPanel = user.permissions.includes("manage_users");
  const showOfficerPanel = !showAdminPanel && user.permissions.includes("monitor_operations");
  const showPurchaserPanel =
    !showAdminPanel && !showOfficerPanel && user.permissions.includes("record_purchases");

  // No relevant permission at all — show the generic dashboard immediately
  // without hitting the admin/officer-only endpoints.
  if (!showOfficerPanel && !showAdminPanel && !showPurchaserPanel) {
    return <GenericDashboard />;
  }

  // Preview never fetches real data — see previewSampleData.ts. Portal
  // Preview never offers the Admin or Authorized Purchaser roles themselves
  // (the admin is the one doing the previewing), so only the officer sample
  // dashboard is needed here.
  if (user.previewing) {
    return showOfficerPanel ? (
      <OfficerDashboardPanel data={PREVIEW_OFFICER_DASHBOARD} />
    ) : (
      <GenericDashboard />
    );
  }

  // Only fetch the endpoint(s) relevant to this user's role; run them in
  // parallel since they're independent requests.
  const [officerRes, overviewRes, purchaserRes, paddyTypesRes] = await Promise.all([
    showOfficerPanel ? apiFetch("/api/officer/dashboard/") : null,
    showAdminPanel ? apiFetch("/api/admin/overview/") : null,
    showPurchaserPanel ? apiFetch("/api/purchaser/dashboard/") : null,
    showPurchaserPanel ? apiFetch("/api/admin/paddy-types/") : null,
  ]);

  const officerData = officerRes?.ok ? await officerRes.json() : null;
  const overviewData = overviewRes?.ok ? await overviewRes.json() : null;
  const purchaserData = purchaserRes?.ok ? await purchaserRes.json() : null;
  const paddyTypes = paddyTypesRes?.ok ? await paddyTypesRes.json() : [];

  // Fall back to the generic dashboard if the backend request(s) failed.
  if (!officerData && !overviewData && !purchaserData) {
    return <GenericDashboard />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {overviewData && <AdminOverviewPanel data={overviewData} />}
      {officerData && <OfficerDashboardPanel data={officerData} />}
      {purchaserData && <PurchaserDashboardPanel data={purchaserData} paddyTypes={paddyTypes} />}
    </div>
  );
}
