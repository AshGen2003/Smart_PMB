/**
 * Mill-owner dashboard's business-data section: license/milling KPIs plus
 * recent-licenses and recent-milling-reports tables. Data comes from GET
 * /api/mill-owner/dashboard/ (mills/views.py's MillOwnerDashboardView).
 * Rendered by mill-owner/page.tsx below the license (account-approval)
 * card.
 */
import { FileCheck, Sprout, Factory } from "lucide-react";
import { format } from "date-fns";
import styles from "./MillOwnerDashboard.module.css";

type MillOwnerDashboardData = {
  kpis: {
    total_licenses: number;
    active_license_status: string | null;
    active_license_expiry: string | null;
    total_milling_reports: number;
    total_paddy_processed_kg: string | number;
  };
  licenses: {
    id: number;
    license_no: string | null;
    status: "pending" | "approved" | "rejected";
    applied_date: string;
    expiry_date: string | null;
  }[];
  milling_reports: {
    id: number;
    report_date: string;
    paddy_processed_kg: string;
    rice_output_kg: string;
  }[];
  inspections: {
    id: number;
    inspection_date: string;
    result: "pass" | "fail" | "needs_follow_up";
    officer_name: string | null;
  }[];
};

const INSPECTION_RESULT_LABEL: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  needs_follow_up: "Needs Follow-up",
};

export default function MillOwnerPanel({ data }: { data: MillOwnerDashboardData }) {
  return (
    <>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Active License</span>
            <div className={styles.kpiIcon}><FileCheck size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.active_license_status ?? "None"}</h2>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Licenses</span>
            <div className={styles.kpiIcon}><FileCheck size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.total_licenses}</h2>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Paddy Processed (kg)</span>
            <div className={styles.kpiIcon}><Factory size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{Number(data.kpis.total_paddy_processed_kg).toLocaleString()}</h2>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Milling Reports</span>
            <div className={styles.kpiIcon}><Sprout size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.total_milling_reports}</h2>
        </div>
      </div>

      <div className={styles.tablesGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Licenses</h3>
          </div>
          {data.licenses.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>License No.</th>
                  <th>Status</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.licenses.map((l) => (
                  <tr key={l.id}>
                    <td>{l.license_no ?? "—"}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge-${l.status === "approved" ? "success" : l.status === "rejected" ? "danger" : "warning"}`]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td>{l.expiry_date ? format(new Date(l.expiry_date), "MMM d, yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.subtitle}>No licenses yet — apply from the Licenses page.</p>
          )}
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Milling Reports</h3>
          </div>
          {data.milling_reports.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Paddy (kg)</th>
                  <th>Rice (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.milling_reports.map((r) => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.report_date), "MMM d, yyyy")}</td>
                    <td>{Number(r.paddy_processed_kg).toLocaleString()}</td>
                    <td>{Number(r.rice_output_kg).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.subtitle}>No milling reports yet — submit one from the Milling Reports page.</p>
          )}
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Inspections</h3>
          </div>
          {data.inspections.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Result</th>
                  <th>Officer</th>
                </tr>
              </thead>
              <tbody>
                {data.inspections.map((i) => (
                  <tr key={i.id}>
                    <td>{format(new Date(i.inspection_date), "MMM d, yyyy")}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          styles[`badge-${i.result === "pass" ? "success" : i.result === "fail" ? "danger" : "warning"}`]
                        }`}
                      >
                        {INSPECTION_RESULT_LABEL[i.result]}
                      </span>
                    </td>
                    <td>{i.officer_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.subtitle}>No inspections recorded yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
