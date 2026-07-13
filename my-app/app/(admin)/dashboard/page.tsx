import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import AdminOverviewPanel from "./AdminOverviewPanel";
import GenericDashboard from "./GenericDashboard";
import OfficerDashboardPanel from "./OfficerDashboardPanel";

export default async function DashboardPage() {
  const user = await requireUser();

  const showOfficerPanel = user.permissions.includes("monitor_operations");
  const showAdminPanel = user.permissions.includes("manage_users");

  if (!showOfficerPanel && !showAdminPanel) {
    return <GenericDashboard />;
  }

  const [officerRes, overviewRes] = await Promise.all([
    showOfficerPanel ? apiFetch("/api/officer/dashboard/") : null,
    showAdminPanel ? apiFetch("/api/admin/overview/") : null,
  ]);

  const officerData = officerRes?.ok ? await officerRes.json() : null;
  const overviewData = overviewRes?.ok ? await overviewRes.json() : null;

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
