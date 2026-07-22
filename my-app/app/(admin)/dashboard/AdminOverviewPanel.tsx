/**
 * Presentational panel shown on the admin dashboard for users with the
 * `manage_users` permission. Purely renders the KPI cards, charts, and
 * tables from data fetched by the parent page
 * (`(admin)/dashboard/page.tsx`) — it does no fetching of its own.
 *
 * Client Component: recharts renders via the browser (ResizeObserver etc.),
 * so it can't run as a plain Server Component.
 */
"use client";

import Link from "next/link";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ShieldCheck, UserCheck, Users } from "lucide-react";
import OnlineRolesPanel from "./OnlineRolesPanel";
import styles from "./Dashboard.module.css";

/** Shape of the payload returned by `GET /api/admin/overview/`. */
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

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--card-bg)",
    borderColor: "var(--card-border)",
    borderRadius: "8px",
  },
  labelStyle: { color: "var(--foreground)" },
  itemStyle: { color: "var(--foreground)" },
};

// One fixed color per role slot, shared between the bar chart, the "Users
// by Role" table bullet, and the "Recent Accounts" table bullet (the
// latter looked up by role name) so a role's bar and any table row
// belonging to it are identifiable at a glance.
const ROLE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-neutral)",
];

/** Renders KPI cards, role-breakdown charts, and role-breakdown/recent-accounts tables. */
export default function AdminOverviewPanel({ data }: { data: AdminOverviewData }) {
  // Looks up a role's fixed color by name, for the table bullets below.
  const roleColorOf = (roleName: string) => {
    const index = data.role_breakdown.findIndex((r) => r.name === roleName);
    return ROLE_COLORS[(index < 0 ? 0 : index) % ROLE_COLORS.length];
  };

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

      <div className={styles.chartsGrid}>
        <Link href="/roles" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Users by Role
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.role_breakdown} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-muted)"
                  tick={{ fill: "var(--text-muted)" }}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="user_count" name="Users" radius={[4, 4, 0, 0]}>
                  {data.role_breakdown.map((r, index) => (
                    <Cell key={r.slug} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Link>

        <OnlineRolesPanel roleOrder={data.role_breakdown} />
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
              {data.role_breakdown.map((r, i) => (
                <tr key={r.slug}>
                  <td>
                    <div className={styles.userNameRow}>
                      <span
                        className={styles.userColorDot}
                        style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}
                        aria-hidden
                      />
                      {r.name}
                    </div>
                  </td>
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
                    <div className={styles.userNameRow}>
                      <span
                        className={styles.userColorDot}
                        style={{ backgroundColor: roleColorOf(u.role_name) }}
                        aria-hidden
                      />
                      <div>
                        <div>{u.full_name || u.email}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {u.email}
                        </div>
                      </div>
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
