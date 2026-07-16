"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { BarChart3, Download, Package, Receipt } from "lucide-react";
import styles from "./Reports.module.css";

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
};

function toCsv(headers: string[], rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

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
        <h1 className={styles.pageTitle}>Reports &amp; Analytics</h1>

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
