/**
 * Charts shown on the farmer dashboard: harvest volume over time and a
 * breakdown of harvest statuses. Split out from page.tsx (a Server
 * Component) into its own Client Component because recharts renders via
 * the browser (ResizeObserver etc.) and can't run on the server.
 */
"use client";

import {
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
import styles from "./FarmerDashboard.module.css";

type FarmerChartsData = {
  status_breakdown: { status: string; label: string; count: number }[];
  harvest_trend: { period: string; quantity_kg: number }[];
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

/** Renders the "Harvest Volume" line chart and "Harvest Status" pie chart, side by side. */
export default function FarmerCharts({ data }: { data: FarmerChartsData }) {
  return (
    <div className={styles.gridTwo}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Harvest Volume (last 12 weeks)</h3>
        </div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.harvest_trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
              <XAxis dataKey="period" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${Number(value).toLocaleString()} kg`, "Quantity"]} />
              <Line type="monotone" dataKey="quantity_kg" name="Quantity (kg)" stroke="var(--chart-2)" strokeWidth={3} dot={{ fill: "var(--chart-2)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Harvest Status</h3>
        </div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.status_breakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={5}
                dataKey="count"
                nameKey="label"
                stroke="none"
              >
                {data.status_breakdown.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "var(--chart-neutral)"} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
