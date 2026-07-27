/**
 * `/mill-owner/milling-reports` — submission form plus full history of the
 * logged-in mill owner's periodic milling reports.
 */
import { format } from "date-fns";
import { apiFetch } from "@/app/lib/api";
import MillingReportForm from "./MillingReportForm";
import styles from "./MillingReports.module.css";

type MillingReportRow = {
  id: number;
  report_date: string;
  paddy_processed_kg: string;
  rice_output_kg: string;
  notes: string;
};

export default async function MillingReportsPage() {
  const res = await apiFetch("/api/mill-owner/milling-reports/");
  const reports: MillingReportRow[] = res.ok ? await res.json() : [];

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Milling Reports</h1>
        <span className={styles.subtitle}>Submit periodic reports of paddy processed and rice produced</span>
      </div>

      <MillingReportForm />

      <div className={styles.container}>
        {reports.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Paddy Processed (kg)</th>
                <th>Rice Output (kg)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{format(new Date(r.report_date), "MMM d, yyyy")}</td>
                  <td>{Number(r.paddy_processed_kg).toLocaleString()}</td>
                  <td>{Number(r.rice_output_kg).toLocaleString()}</td>
                  <td>{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No milling reports submitted yet.</div>
        )}
      </div>
    </div>
  );
}
