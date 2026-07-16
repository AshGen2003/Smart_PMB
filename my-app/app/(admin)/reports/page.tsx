import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import ReportsManager, { type ReportsData } from "./ReportsManager";
import AdminReportPanel, { type AdminReportData } from "./AdminReportPanel";

export default async function ReportsPage() {
  const user = await requireAnyPermission("manage_users", "generate_reports");
  const showAdminReport = user.permissions.includes("manage_users");

  if (showAdminReport) {
    const res = await apiFetch("/api/admin/reports/admin-summary/");
    const data: AdminReportData = res.ok
      ? await res.json()
      : {
          generated_at: new Date().toISOString(),
          users: { total: 0, active: 0 },
          roles: [],
          security: { login_success: 0, login_failed: 0, account_locked: 0 },
          recent_audit: [],
          recent_auth: [],
          backups: { total: 0, completed: 0, failed: 0, last: null },
        };

    return <AdminReportPanel data={data} />;
  }

  const res = await apiFetch("/api/officer/reports/");
  const data: ReportsData = res.ok
    ? await res.json()
    : { stock_report: [], transaction_report: [] };

  return <ReportsManager data={data} />;
}
