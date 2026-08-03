/**
 * Client Component for the warehouse manager's full stock-movement
 * history — the un-capped counterpart to the dashboard's "Recent stock
 * movements" card (which only shows the latest 20). Search-filters
 * client-side over the already-fetched (capped at 200 server-side) list.
 */
"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { History, Search } from "lucide-react";
import styles from "./Transactions.module.css";

export type TransactionRow = {
  id: number;
  transaction_type: "harvest_collection" | "rice_request_fulfillment" | "manual_adjustment";
  quantity_change: string;
  notes: string;
  created_at: string;
};

const TRANSACTION_LABEL: Record<TransactionRow["transaction_type"], string> = {
  harvest_collection: "Harvest collected",
  rice_request_fulfillment: "Rice request fulfilled",
  manual_adjustment: "Manual adjustment",
};

export default function TransactionsManager({ transactions }: { transactions: TransactionRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        TRANSACTION_LABEL[t.transaction_type].toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Stock Movements</h1>
        <span className={styles.subtitle}>Full history for your warehouse</span>
      </div>

      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by type or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.container}>
        {filtered.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const positive = Number(t.quantity_change) >= 0;
                  return (
                    <tr key={t.id}>
                      <td>{TRANSACTION_LABEL[t.transaction_type]}</td>
                      <td className={positive ? styles.valuePositive : styles.valueNegative}>
                        {positive ? "+" : ""}
                        {Number(t.quantity_change).toLocaleString()} kg
                      </td>
                      <td>{t.notes || "—"}</td>
                      <td>{format(new Date(t.created_at), "MMM d, yyyy h:mm a")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <History size={28} />
            <p>{search ? "No movements match your search." : "No stock movements recorded yet."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
