/**
 * Presentational panel shown to admins (`manage_users` permission) on the
 * reports page: a governance-focused summary (users/roles, security
 * activity, audit log, backups) plus a link to download the same report as
 * a PDF via the /api/reports/admin-pdf route handler.
 *
 * Client Component: recharts renders via the browser (ResizeObserver etc.),
 * so it can't run as a plain Server Component.
 */
"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, FileDown } from "lucide-react";
import styles from "./Reports.module.css";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--card-bg)",
    borderColor: "var(--card-border)",
    borderRadius: "8px",
  },
  labelStyle: { color: "var(--foreground)" },
  itemStyle: { color: "var(--foreground)" },
};

/** Shape of the payload returned by `GET /api/admin/reports/admin-summary/`. */
export type AdminReportData = {
  generated_at: string;
  users: { total: number; active: number };
  roles: { name: string; user_count: number; permission_count: number }[];
  security: { login_success: number; login_failed: number; account_locked: number };
  login_activity_trend: { date: string; success: number; failed: number }[];
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

/** Formats an ISO date string for display, e.g. "Jul 16, 2026, 3:45 PM". */
function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Renders the users/roles, security, audit log, login activity, and backups sections. */
export default function AdminReportPanel({ data }: { data: AdminReportData }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin Report</h1>
        {/* Route Handler proxies this to the Django backend and streams back a PDF,
            since httpOnly auth cookies aren't readable by client-side fetch. */}
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

          <Link
            href="/roles"
            className={styles.inlineChartLink}
            style={{ marginTop: "1.25rem" }}
          >
            <span className={styles.inlineChartLinkLabel}>
              Users &amp; permissions by role
              <ArrowRight size={14} className={styles.chartLinkIcon} />
            </span>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.roles} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="user_count" name="Users" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="permission_count" name="Permissions" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Link>

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

          <div className={styles.chartContainer} style={{ marginTop: "1.25rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.login_activity_trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="success" name="Successful logins" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" name="Failed logins" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
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
