/**
 * `/reports` — reports & analytics page. Requires either `manage_users`
 * (full admin governance report) or `generate_reports` (officer stock/
 * transaction reports). Which variant is shown depends on which
 * permission the user has — see showAdminReport below.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import ReportsManager, { type ReportsData } from "./ReportsManager";
import AdminReportPanel, { type AdminReportData } from "./AdminReportPanel";

/**
 * Server Component: picks the admin governance report or the officer
 * stock/transaction report based on permissions, fetches the matching
 * data, and falls back to an empty-shaped payload if the request fails.
 */
export default async function ReportsPage() {
  const user = await requireAnyPermission("manage_users", "generate_reports");
  // Admin report takes priority when the user has both permissions.
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
          login_activity_trend: [],
          recent_audit: [],
          recent_auth: [],
          backups: { total: 0, completed: 0, failed: 0, last: null },
        };

    return <AdminReportPanel data={data} />;
  }

  const res = await apiFetch("/api/officer/reports/");
  const data: ReportsData = res.ok
    ? await res.json()
    : {
        stock_report: [],
        transaction_report: [],
        charts: { grade_distribution: [], payment_status_breakdown: [], monthly_purchases: [] },
      };

  return <ReportsManager data={data} />;
}
