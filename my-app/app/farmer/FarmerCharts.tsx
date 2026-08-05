/**
 * Charts shown on the farmer dashboard: harvest volume over time and a
 * breakdown of harvest statuses. Split out from page.tsx (a Server
 * Component) into its own Client Component because recharts renders via
 * the browser (ResizeObserver etc.) and can't run on the server.
 */
"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "./FarmerDashboard.module.css";

type FarmerChartsData = {
  status_breakdown: { status: string; label: string; count: number }[];
  harvest_trend: { period: string; quantity_kg: number }[];
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

const LEGEND_STYLE = {
  wrapperStyle: { fontSize: 12, color: "var(--text-muted)" },
  iconType: "circle" as const,
  iconSize: 8,
};

/** Renders the "Harvest Volume" line chart. */
export default function FarmerCharts({ data }: { data: FarmerChartsData }) {
  const { t } = useLanguage();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{t.farmerCharts.harvestVolumeTitle}</h3>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.harvest_trend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
            <XAxis dataKey="period" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [`${Number(value).toLocaleString()} kg`, t.farmerCharts.quantityLabel]} />
            <Legend {...LEGEND_STYLE} />
            <Line type="monotone" dataKey="quantity_kg" name={t.farmerCharts.quantityLabel} stroke="var(--chart-2)" strokeWidth={3} dot={{ fill: "var(--chart-2)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
