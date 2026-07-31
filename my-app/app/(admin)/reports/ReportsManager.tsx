/**
 * Client Component for PMB officers (`generate_reports` permission):
 * tabbed stock/transaction reports with client-side CSV export. Data is
 * fetched server-side by the parent page; this component only renders it
 * and builds/downloads CSV files in the browser.
 */
"use client";

import React, { useState } from "react";
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
import { ArrowRight, BarChart3, Download, FileDown, Package, Receipt } from "lucide-react";
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

// Fixed (not theme-swapped) chart colors, distinct from the brand
// primary/accent so data marks stay legible against both a light and a
// dark card surface instead of blending into the surrounding UI chrome.
const GRADE_COLORS: Record<string, string> = { A: "var(--chart-1)", B: "var(--chart-2)", C: "var(--chart-4)" };
const PAYMENT_COLORS: Record<string, string> = {
  pending: "var(--chart-3)",
  completed: "var(--chart-1)",
  failed: "var(--chart-4)",
};

type StockRow = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: string;
  district_name: string | null;
};

type TransactionRow = {
  id: number;
  purchase_date: string;
  farmer_name: string;
  paddy_type: string | null;
  warehouse: string | null;
  quantity_kg: string;
  unit_price: string | null;
  amount: string | null;
  payment_status: string | null;
  status: string;
};

export type ReportsData = {
  stock_report: StockRow[];
  transaction_report: TransactionRow[];
  charts: {
    grade_distribution: { grade: string; count: number }[];
    payment_status_breakdown: { status: string; label: string; count: number }[];
    monthly_purchases: { period: string; quantity_kg: number; amount: number }[];
  };
};

/** Builds a CSV string from headers + rows, quoting/escaping any value that contains a comma, quote, or newline. */
function toCsv(headers: string[], rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

// Triggers a browser download of the given CSV text by creating a
// temporary object URL and clicking a hidden <a download> link — this all
// happens client-side, no server round-trip needed.
function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Renders the stock/transaction report tabs with CSV export buttons. */
export default function ReportsManager({ data }: { data: ReportsData }) {
  const [tab, setTab] = useState<"stock" | "transactions">("stock");

  function exportStock() {
    const csv = toCsv(
      ["Warehouse", "Code", "District", "Current Stock (kg)", "Capacity (kg)", "Status"],
      data.stock_report.map((w) => [
        w.name,
        w.code,
        w.district_name,
        w.current_stock,
        w.capacity,
        w.status,
      ])
    );
    downloadCsv("stock-report.csv", csv);
  }

  function exportTransactions() {
    const csv = toCsv(
      ["Date", "Farmer", "Paddy Type", "Warehouse", "Quantity (kg)", "Unit Price", "Amount", "Payment Status", "Status"],
      data.transaction_report.map((t) => [
        t.purchase_date,
        t.farmer_name,
        t.paddy_type,
        t.warehouse,
        t.quantity_kg,
        t.unit_price,
        t.amount,
        t.payment_status,
        t.status,
      ])
    );
    downloadCsv("transaction-report.csv", csv);
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleRow}>
          <h1 className={styles.pageTitle}>Reports &amp; Analytics</h1>
          {/* Route Handler proxies this to the Django backend and streams back a PDF,
              since httpOnly auth cookies aren't readable by client-side fetch. */}
          <a href="/api/reports/officer-pdf" className={styles.pdfBtn}>
            <FileDown size={16} /> Download PDF
          </a>
        </div>

        <div className={styles.tabsRow}>
          <button
            type="button"
            className={clsx(styles.tab, tab === "stock" && styles.tabActive)}
            onClick={() => setTab("stock")}
          >
            <Package size={15} /> Stock Report
          </button>
          <button
            type="button"
            className={clsx(styles.tab, tab === "transactions" && styles.tabActive)}
            onClick={() => setTab("transactions")}
          >
            <Receipt size={15} /> Transaction Report
          </button>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <Link href="/approvals" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Purchases by Month
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.monthly_purchases} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="period" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value) => Number(value).toLocaleString()} />
                <Line type="monotone" dataKey="quantity_kg" name="Quantity (kg)" stroke="var(--chart-2)" strokeWidth={3} dot={{ fill: "var(--chart-2)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Link>

        <Link href="/approvals" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Grade Distribution
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.grade_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="grade"
                  stroke="none"
                >
                  {data.charts.grade_distribution.map((entry) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] ?? "var(--chart-neutral)"} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Link>

        <Link href="/approvals" className={clsx(styles.chartCard, styles.chartCardLink)}>
          <h3 className={styles.chartTitle}>
            Payment Status
            <ArrowRight size={14} className={styles.chartLinkIcon} />
          </h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.payment_status_breakdown} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)" }} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Payments" radius={[4, 4, 0, 0]}>
                  {data.charts.payment_status_breakdown.map((entry) => (
                    <Cell key={entry.status} fill={PAYMENT_COLORS[entry.status] ?? "var(--chart-neutral)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Link>
      </div>

      {tab === "stock" && (
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Stock by warehouse</h2>
            <button type="button" className={styles.exportBtn} onClick={exportStock}>
              <Download size={15} /> Export CSV
            </button>
          </div>

          {data.stock_report.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>District</th>
                    <th>Current stock (kg)</th>
                    <th>Capacity (kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock_report.map((w) => (
                    <tr key={w.id}>
                      <td>
                        {w.name} <span className={styles.muted}>({w.code})</span>
                      </td>
                      <td>{w.district_name ?? "—"}</td>
                      <td>{Number(w.current_stock).toLocaleString()}</td>
                      <td>{Number(w.capacity).toLocaleString()}</td>
                      <td>{w.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <BarChart3 size={26} />
              <p>No warehouse data yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "transactions" && (
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionLabel}>Recent transactions</h2>
            <button type="button" className={styles.exportBtn} onClick={exportTransactions}>
              <Download size={15} /> Export CSV
            </button>
          </div>

          {data.transaction_report.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Farmer</th>
                    <th>Paddy type</th>
                    <th>Warehouse</th>
                    <th>Quantity (kg)</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transaction_report.map((t) => (
                    <tr key={t.id}>
                      <td>{t.purchase_date}</td>
                      <td>{t.farmer_name}</td>
                      <td>{t.paddy_type ?? "—"}</td>
                      <td>{t.warehouse ?? "—"}</td>
                      <td>{Number(t.quantity_kg).toLocaleString()}</td>
                      <td>{t.amount ? `Rs. ${Number(t.amount).toLocaleString()}` : "—"}</td>
                      <td>{t.payment_status ?? "—"}</td>
                      <td>{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <BarChart3 size={26} />
              <p>No transactions yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
