import clsx from "clsx";
import { ShieldCheck, UserCheck, Users } from "lucide-react";
import styles from "./Dashboard.module.css";

type AdminOverviewData = {
  total_users: number;
  active_users: number;
  total_roles: number;
  role_breakdown: { name: string; slug: string; user_count: number }[];
  recent_users: {
    id: string;
    email: string;
    full_name: string;
    role_name: string;
    date_joined: string;
    is_active: boolean;
  }[];
};

export default function AdminOverviewPanel({ data }: { data: AdminOverviewData }) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Overview</h1>
        <span className={styles.subtitle}>Platform-wide accounts and roles</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Users</span>
            <div className={styles.kpiIcon}><Users size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.total_users}</h2>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Active Users</span>
            <div className={styles.kpiIcon}><UserCheck size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.active_users}</h2>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Roles</span>
            <div className={styles.kpiIcon}><ShieldCheck size={20} /></div>
          </div>
          <h2 className={styles.kpiValue}>{data.total_roles}</h2>
        </div>
      </div>

      <div className={styles.tablesGrid}>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Users by Role</h3>
            <a href="/roles" className={styles.viewAll}>View All</a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Role</th>
                <th>Users</th>
              </tr>
            </thead>
            <tbody>
              {data.role_breakdown.map((r) => (
                <tr key={r.slug}>
                  <td>{r.name}</td>
                  <td>{r.user_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3 className={styles.tableTitle}>Recent Accounts</h3>
            <a href="/residents" className={styles.viewAll}>View All</a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>{u.full_name || u.email}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {u.email}
                    </div>
                  </td>
                  <td>{u.role_name}</td>
                  <td>
                    <span
                      className={clsx(
                        styles.badge,
                        styles[`badge-${u.is_active ? "success" : "danger"}`]
                      )}
                    >
                      {u.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
