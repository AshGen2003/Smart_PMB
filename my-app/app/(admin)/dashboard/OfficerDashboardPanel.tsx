/**
 * Presentational panel shown on the admin dashboard for PMB officers
 * (users with `monitor_operations` but not `manage_users`). Purely renders
 * the KPI cards, charts, and tables from data fetched by the parent page
 * (`(admin)/dashboard/page.tsx`) — it does no fetching of its own.
 *
 * Client Component: recharts renders via the browser (ResizeObserver etc.),
 * so it can't run as a plain Server Component.
 */
"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Boxes, ClipboardList, Sprout, Warehouse } from "lucide-react";
import styles from "./Dashboard.module.css";

/** Shape of the payload returned by `GET /api/officer/dashboard/`. */
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
  charts: {
    status_breakdown: { status: string; label: string; count: number }[];
    harvest_trend: { period: string; quantity_kg: number }[];
  };
};

// Fixed (not theme-swapped) chart colors, distinct from the brand
// primary/accent so data marks stay legible against both a light and a
// dark card surface instead of blending into the surrounding UI chrome.
const STATUS_COLORS: Record<string, string> = {
  pending: "var(--chart-3)",
  verified: "var(--chart-2)",
  collected: "var(--chart-1)",
  rejected: "var(--chart-4)",
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

/** Renders KPI cards, status/volume/stock charts, and recent-harvests/warehouse-stock tables. */
export default function OfficerDashboardPanel({
  data,
  title = "PMB Officer Dashboard",
}: {
  data: OfficerDashboardData;
  title?: string;
}) {
  // Warehouse decimal fields arrive as strings (DRF's default decimal
  // serialization) — recharts needs actual numbers to size the bars.
  const stockChartData = data.warehouse_stock.map((w) => ({
    name: w.name,
    current_stock: Number(w.current_stock),
    capacity: Number(w.capacity),
  }));

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
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

      <div className={styles.chartsGrid}>
        <Link href="/approvals" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Harvest Volume (last 12 weeks)
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.harvest_trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="period" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Quantity"]} />
                <Line type="monotone" dataKey="quantity_kg" name="Quantity (kg)" stroke="var(--chart-2)" strokeWidth={3} dot={{ fill: "var(--chart-2)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Link>

        <Link href="/approvals" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Harvest Status Breakdown
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.status_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="label"
                  stroke="none"
                >
                  {data.charts.status_breakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "var(--chart-neutral)"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Link>

        <Link href="/warehouses" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Stock by Warehouse (kg)
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => Number(value).toLocaleString()} />
                <Bar dataKey="current_stock" name="Current stock" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" name="Capacity" fill="var(--chart-neutral)" radius={[4, 4, 0, 0]} fillOpacity={0.35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Link>
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
