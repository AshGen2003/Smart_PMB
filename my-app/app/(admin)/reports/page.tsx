import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import ReportsManager, { type ReportsData } from "./ReportsManager";

export default async function ReportsPage() {
  await requirePermission("generate_reports");

  const res = await apiFetch("/api/officer/reports/");
  const data: ReportsData = res.ok
    ? await res.json()
    : { stock_report: [], transaction_report: [] };

  return <ReportsManager data={data} />;
}
