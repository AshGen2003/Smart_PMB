/**
 * Authorized-purchaser-specific section of the partner dashboard: stock/
 * request KPIs plus a stock-by-type table and recent-requests table. Data
 * comes from GET /api/purchaser/dashboard/ (purchases/views.py's
 * PurchaserDashboardView). Rendered by partner/page.tsx below the license
 * (account-approval) card, only for role === "authorized_purchaser".
 */
import { Boxes, Layers, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import styles from "./PartnerDashboard.module.css";

type PurchaserDashboardData = {
  kpis: {
    total_stock_kg: string | number;
    stock_types_count: number;
    pending_requests_count: number;
  };
  stock_by_type: {
    id: number;
    paddy_type_name: string | null;
    quantity_kg: string;
  }[];
  recent_requests: {
    id: number;
    paddy_type_name: string | null;
    quantity_kg: string;
    status: "pending" | "approved" | "rejected" | "fulfilled";
    requested_date: string;
  }[];
};

const STATUS_CLASS: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  fulfilled: "badge-success",
  rejected: "badge-danger",
};

export default function PurchaserPanel({ data }: { data: PurchaserDashboardData }) {
  return (
    <>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Stock (kg)</span>
            <div className={styles.kpiIcon}><Boxes size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{Number(data.kpis.total_stock_kg).toLocaleString()}</h2>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Rice Types in Stock</span>
            <div className={styles.kpiIcon}><Layers size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.stock_types_count}</h2>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Pending Requests</span>
            <div className={styles.kpiIcon}><ClipboardList size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.pending_requests_count}</h2>
        </div>
      </div>

      <div className={styles.tablesGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>My Stock by Rice Type</h3>
          </div>
          {data.stock_by_type.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rice type</th>
                  <th>Quantity (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.stock_by_type.map((s) => (
                  <tr key={s.id}>
                    <td>{s.paddy_type_name ?? "—"}</td>
                    <td>{Number(s.quantity_kg).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.subtitle}>You don&apos;t have any stock yet.</p>
          )}
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Requests</h3>
          </div>
          {data.recent_requests.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rice type</th>
                  <th>Quantity (kg)</th>
                  <th>Requested</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.paddy_type_name ?? "—"}</td>
                    <td>{Number(r.quantity_kg).toLocaleString()}</td>
                    <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[STATUS_CLASS[r.status]]}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.subtitle}>
              You haven&apos;t made any requests yet — use the Rice Requests page to submit one.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
