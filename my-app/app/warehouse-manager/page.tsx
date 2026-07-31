/**
 * `/warehouse-manager` — the warehouse manager portal's home dashboard:
 * assigned-warehouse cards with utilization bars, capacity/stock KPIs,
 * a table of harvests awaiting pickup (verified but not yet collected),
 * and a recent-approvals feed. Access is enforced by
 * app/warehouse-manager/layout.tsx.
 */
import { format } from "date-fns";
import clsx from "clsx";
import { Warehouse as WarehouseIcon, Package, Percent, Truck } from "lucide-react";
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import styles from "./WarehouseManagerDashboard.module.css";

type WarehouseRow = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: string;
  district_name: string | null;
};

type HarvestRow = {
  id: number;
  farmer_name: string | null;
  paddy_type_name: string | null;
  warehouse_name: string | null;
  quantity_kg: string;
  harvest_date: string;
  status: string;
};

type DashboardPayload = {
  warehouses: WarehouseRow[];
  kpis: {
    total_warehouses: number;
    total_capacity: number;
    total_stock: number;
    utilization_pct: number;
  };
  pending_pickup: HarvestRow[];
  recent_approvals: HarvestRow[];
};

const STATUS_BADGE: Record<string, string> = {
  verified: "badge-warning",
  collected: "badge-success",
};

export default async function WarehouseManagerDashboardPage() {
  const user = await getCurrentUser();
  const res = await apiFetch("/api/warehouse-manager/dashboard/");
  const data: DashboardPayload = res.ok
    ? await res.json()
    : { warehouses: [], kpis: { total_warehouses: 0, total_capacity: 0, total_stock: 0, utilization_pct: 0 }, pending_pickup: [], recent_approvals: [] };

  const { warehouses, kpis, pending_pickup: pendingPickup, recent_approvals: recentApprovals } = data;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back, {user?.fullName ?? "Warehouse Manager"}</h1>
        <span className={styles.subtitle}>{format(new Date(), "EEEE, MMMM do, yyyy")}</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Warehouses</span>
            <div className={styles.kpiIcon}>
              <WarehouseIcon size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.total_warehouses}</h2>
          <span className={styles.kpiHint}>Assigned to you</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Capacity</span>
            <div className={styles.kpiIcon}>
              <Package size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{Number(kpis.total_capacity).toLocaleString()} kg</h2>
          <span className={styles.kpiHint}>{Number(kpis.total_stock).toLocaleString()} kg in stock</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Utilization</span>
            <div className={styles.kpiIcon}>
              <Percent size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.utilization_pct}%</h2>
          <span className={styles.kpiHint}>Across all assigned warehouses</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Awaiting Pickup</span>
            <div className={styles.kpiIcon}>
              <Truck size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{pendingPickup.length}</h2>
          <span className={styles.kpiHint}>Verified, not yet collected</span>
        </div>
      </div>

      {warehouses.length > 0 ? (
        <div className={styles.warehouseGrid}>
          {warehouses.map((w) => {
            const capacity = Number(w.capacity) || 0;
            const stock = Number(w.current_stock) || 0;
            const pct = capacity ? Math.min(100, Math.round((stock / capacity) * 100)) : 0;
            return (
              <div key={w.id} className={styles.warehouseCard}>
                <span className={styles.warehouseCardName}>{w.name}</span>
                <span className={styles.warehouseCardMeta}>
                  {w.code} {w.district_name ? `· ${w.district_name}` : ""}
                </span>
                <span className={styles.warehouseCardMeta}>
                  {stock.toLocaleString()} / {capacity.toLocaleString()} kg ({pct}%)
                </span>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.card}>
          <p className={styles.emptyState}>
            No warehouse assigned yet — contact an officer to be linked to a warehouse.
          </p>
        </div>
      )}

      <div className={styles.gridTwo}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Awaiting Pickup</h3>
          </div>
          {pendingPickup.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Paddy</th>
                  <th>Qty (kg)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingPickup.map((h) => (
                  <tr key={h.id}>
                    <td>{h.farmer_name ?? "—"}</td>
                    <td>{h.paddy_type_name ?? "—"}</td>
                    <td>{Number(h.quantity_kg).toLocaleString()}</td>
                    <td>
                      <span className={clsx(styles.badge, styles[STATUS_BADGE[h.status] ?? "badge-neutral"])}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.emptyState}>Nothing awaiting pickup right now.</p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Approvals</h3>
          </div>
          {recentApprovals.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Paddy</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentApprovals.map((h) => (
                  <tr key={h.id}>
                    <td>{h.farmer_name ?? "—"}</td>
                    <td>{h.paddy_type_name ?? "—"}</td>
                    <td>{format(new Date(h.harvest_date), "MMM d, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.emptyState}>No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
