import { FileDown } from "lucide-react";
import styles from "./Reports.module.css";

export type AdminReportData = {
  generated_at: string;
  users: { total: number; active: number };
  roles: { name: string; user_count: number; permission_count: number }[];
  security: { login_success: number; login_failed: number; account_locked: number };
  recent_audit: {
    created_at: string;
    actor: string;
    action: string;
    module: string;
    details: string;
  }[];
  recent_auth: {
    created_at: string;
    email: string;
    action: string;
    ip_address: string;
  }[];
  backups: {
    total: number;
    completed: number;
    failed: number;
    last: { created_at: string; status: string } | null;
  };
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminReportPanel({ data }: { data: AdminReportData }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin Report</h1>
        <a href="/api/reports/admin-pdf" className={styles.pdfBtn}>
          <FileDown size={16} /> Download PDF
        </a>
      </div>

      <div className={styles.sectionGap}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Users &amp; Roles</h2>
          </div>
          <div className={styles.kpiRow}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.users.total}</span>
              <span className={styles.kpiLabel}>Total users</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.users.active}</span>
              <span className={styles.kpiLabel}>Active users</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.roles.length}</span>
              <span className={styles.kpiLabel}>Roles</span>
            </div>
          </div>

          <div className={styles.tableWrap} style={{ marginTop: "1.25rem" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Users</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {data.roles.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.user_count}</td>
                    <td>{r.permission_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Security Activity (last 30 days)</h2>
          </div>
          <div className={styles.kpiRow}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.security.login_success}</span>
              <span className={styles.kpiLabel}>Successful logins</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.security.login_failed}</span>
              <span className={styles.kpiLabel}>Failed logins</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.security.account_locked}</span>
              <span className={styles.kpiLabel}>Accounts locked</span>
            </div>
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Recent Audit Log</h2>
          </div>
          {data.recent_audit.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_audit.map((a, i) => (
                    <tr key={i}>
                      <td>{fmt(a.created_at)}</td>
                      <td>{a.actor}</td>
                      <td>{a.action.replaceAll("_", " ")}</td>
                      <td>{a.module}</td>
                      <td>{a.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.muted}>No audit activity yet.</p>
          )}
        </div>

        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Recent Login Activity</h2>
          </div>
          {data.recent_auth.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Email</th>
                    <th>Action</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_auth.map((l, i) => (
                    <tr key={i}>
                      <td>{fmt(l.created_at)}</td>
                      <td>{l.email || "—"}</td>
                      <td>{l.action.replaceAll("_", " ")}</td>
                      <td>{l.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.muted}>No login activity recorded yet.</p>
          )}
        </div>

        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Backups</h2>
          </div>
          <div className={styles.kpiRow}>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.backups.total}</span>
              <span className={styles.kpiLabel}>Total</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.backups.completed}</span>
              <span className={styles.kpiLabel}>Completed</span>
            </div>
            <div className={styles.kpiItem}>
              <span className={styles.kpiValue}>{data.backups.failed}</span>
              <span className={styles.kpiLabel}>Failed</span>
            </div>
          </div>
          <p className={styles.muted} style={{ marginTop: "0.75rem" }}>
            Last backup:{" "}
            {data.backups.last
              ? `${fmt(data.backups.last.created_at)} (${data.backups.last.status})`
              : "None yet"}
          </p>
        </div>
      </div>
    </div>
  );
}
