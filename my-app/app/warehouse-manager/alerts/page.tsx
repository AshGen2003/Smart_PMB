/**
 * `/warehouse-manager/alerts` — capacity alerts for the manager's own
 * warehouses: "high" (>=85% utilization, arrange dispatch soon) or "low"
 * (<=20% utilization, consider redirecting intake). Computed on read by
 * WarehouseAlertsView, not stored.
 */
import clsx from "clsx";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import styles from "../WarehouseManagerDashboard.module.css";

type Alert = {
  warehouse_id: number;
  warehouse_name: string;
  district_name: string | null;
  utilization_pct: number;
  level: "high" | "low";
};

export default async function WarehouseManagerAlertsPage() {
  const res = await apiFetch("/api/warehouse-manager/alerts/");
  const alerts: Alert[] = res.ok ? await res.json() : [];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Capacity alerts</h1>
        <span className={styles.subtitle}>
          Warehouses at or above 85% utilization, or at or below 20%.
        </span>
      </div>

      {alerts.length > 0 ? (
        <div className={styles.warehouseGrid}>
          {alerts.map((a) => (
            <div key={a.warehouse_id} className={styles.warehouseCard}>
              <div className={styles.cardHeader}>
                <span className={styles.warehouseCardName}>{a.warehouse_name}</span>
                {a.level === "high" ? (
                  <AlertTriangle size={18} style={{ color: "var(--danger)" }} />
                ) : (
                  <TrendingDown size={18} style={{ color: "var(--warning)" }} />
                )}
              </div>
              <span className={styles.warehouseCardMeta}>
                {a.district_name ? `${a.district_name} · ` : ""}{a.utilization_pct}% utilized
              </span>
              <span
                className={clsx(
                  styles.badge,
                  a.level === "high" ? styles["badge-danger"] : styles["badge-warning"]
                )}
              >
                {a.level === "high" ? "Arrange dispatch soon" : "Consider redirecting intake"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.card}>
          <p className={styles.emptyState}>No alerts — all assigned warehouses are within normal range.</p>
        </div>
      )}
    </div>
  );
}
