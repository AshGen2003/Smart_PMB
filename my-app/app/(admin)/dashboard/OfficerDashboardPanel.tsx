import { Boxes, ClipboardList, Sprout, Warehouse } from "lucide-react";
import styles from "./Dashboard.module.css";

type OfficerDashboardData = {
  kpis: {
    total_warehouses: number;
    total_stock: string | number;
    pending_approvals: number;
    active_paddy_types: number;
  };
  recent_harvests: {
    id: number;
    farmer_name: string | null;
    paddy_type_name: string | null;
    warehouse_name: string | null;
    quantity_kg: string;
    status: string;
  }[];
  warehouse_stock: {
    id: number;
    name: string;
    current_stock: string;
    capacity: string;
  }[];
};

export default function OfficerDashboardPanel({ data }: { data: OfficerDashboardData }) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>PMB Officer Dashboard</h1>
        <span className={styles.subtitle}>Nationwide paddy purchasing overview</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Warehouses</span>
            <div className={styles.kpiIcon}><Warehouse size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.total_warehouses}</h2>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Stock (kg)</span>
            <div className={styles.kpiIcon}><Boxes size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{Number(data.kpis.total_stock).toLocaleString()}</h2>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Pending Approvals</span>
            <div className={styles.kpiIcon}><ClipboardList size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.pending_approvals}</h2>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Active Paddy Types</span>
            <div className={styles.kpiIcon}><Sprout size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.kpis.active_paddy_types}</h2>
        </div>
      </div>

      <div className={styles.tablesGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Harvests</h3>
            <a href="/approvals" className={styles.viewAll}>View All</a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Paddy type</th>
                <th>Quantity (kg)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_harvests.map((h) => (
                <tr key={h.id}>
                  <td>{h.farmer_name ?? "—"}</td>
                  <td>{h.paddy_type_name ?? "—"}</td>
                  <td>{Number(h.quantity_kg).toLocaleString()}</td>
                  <td>{h.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Warehouse Stock</h3>
            <a href="/warehouses" className={styles.viewAll}>View All</a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Stock (kg)</th>
                <th>Capacity (kg)</th>
              </tr>
            </thead>
            <tbody>
              {data.warehouse_stock.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td>{Number(w.current_stock).toLocaleString()}</td>
                  <td>{Number(w.capacity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
