/**
 * Purchaser dashboard's business-data section: stock/request KPIs plus a
 * stock-by-type table and recent-requests table. Data comes from GET
 * /api/purchaser/dashboard/ (purchases/views.py's PurchaserDashboardView).
 * Rendered by purchaser/page.tsx below the license (account-approval)
 * card.
 */
import { Boxes, Layers, ClipboardList, Scale, Banknote } from "lucide-react";
import { format } from "date-fns";
import styles from "./PurchaserDashboard.module.css";

type PaddyTypeOption = {
  id: number;
  type_name: string;
  variety: string;
  guaranteed_price: string;
};

type PurchaserDashboardData = {
  kpis: {
    total_stock_kg: string | number;
    stock_types_count: number;
    pending_requests_count: number;
  };
  limits: {
    weight_limit_kg: string | number | null;
    weight_used_kg: string | number;
    weight_remaining_kg: string | number | null;
    advance_amount: string | number | null;
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

export default function PurchaserPanel({
  data,
  paddyTypes = [],
}: {
  data: PurchaserDashboardData;
  paddyTypes?: PaddyTypeOption[];
}) {
  const { limits } = data;
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
            <span>Paddy Types in Stock</span>
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
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Buying Limit (kg, this season)</span>
            <div className={styles.kpiIcon}><Scale size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>
            {limits.weight_limit_kg !== null
              ? `${Number(limits.weight_used_kg).toLocaleString()} / ${Number(limits.weight_limit_kg).toLocaleString()}`
              : "No limit set"}
          </h2>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Government Advance</span>
            <div className={styles.kpiIcon}><Banknote size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>
            {limits.advance_amount !== null ? `Rs. ${Number(limits.advance_amount).toLocaleString()}` : "—"}
          </h2>
        </div>
      </div>

      {paddyTypes.length > 0 && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Guaranteed Paddy Prices (this season)</h3>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paddy type</th>
                <th>Variety</th>
                <th>Guaranteed price (Rs./kg)</th>
              </tr>
            </thead>
            <tbody>
              {paddyTypes.map((p) => (
                <tr key={p.id}>
                  <td>{p.type_name}</td>
                  <td>{p.variety || "—"}</td>
                  <td>Rs. {Number(p.guaranteed_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.tablesGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>My Stock by Paddy Type</h3>
          </div>
          {data.stock_by_type.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paddy type</th>
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
            </div>
          ) : (
            <p className={styles.subtitle}>You don&apos;t have any stock yet.</p>
          )}
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Requests</h3>
          </div>
          {data.recent_requests.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paddy type</th>
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
            </div>
          ) : (
            <p className={styles.subtitle}>
              You haven&apos;t made any requests yet — use the Paddy Requests page to submit one.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
