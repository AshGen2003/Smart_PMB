/**
 * `/officer/reports` — the officer-portal counterpart to `/reports`.
 * Requires `generate_reports`. Only the officer stock/transaction report
 * variant applies here (the admin governance report lives exclusively in
 * the shared `(admin)` shell) — see (admin)/reports/page.tsx for the
 * dual-branch version this mirrors.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import ReportsManager, { type ReportsData } from "@/app/(admin)/reports/ReportsManager";

export default async function OfficerReportsPage() {
  await requirePermission("generate_reports");

  const res = await apiFetch("/api/officer/reports/");
  const data: ReportsData = res.ok
    ? await res.json()
    : {
        stock_report: [],
        transaction_report: [],
        charts: { grade_distribution: [], payment_status_breakdown: [], monthly_purchases: [] },
      };

  return <ReportsManager data={data} basePath="/officer" />;
}
