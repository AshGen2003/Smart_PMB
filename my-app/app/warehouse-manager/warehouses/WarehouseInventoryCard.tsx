/**
 * Client component for a single warehouse card on the manager's Warehouses
 * page: shows capacity/stock, and an expand/collapse toggle to reveal its
 * inventory-by-paddy-type breakdown (fetched server-side up front and
 * passed in as a prop — no client-side data fetching needed here).
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "../WarehouseManagerDashboard.module.css";

export type InventoryRow = { paddy_type: string; quantity_kg: number };

export default function WarehouseInventoryCard({
  name,
  code,
  districtName,
  capacity,
  currentStock,
  status,
  inventory,
}: {
  name: string;
  code: string;
  districtName: string | null;
  capacity: number;
  currentStock: number;
  status: string;
  inventory: InventoryRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = capacity ? Math.min(100, Math.round((currentStock / capacity) * 100)) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{name}</h3>
          <span className={styles.warehouseCardMeta}>
            {code} {districtName ? `· ${districtName}` : ""} · {status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={styles.badge}
          style={{ cursor: "pointer", border: "none" }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <span className={styles.warehouseCardMeta}>
        {currentStock.toLocaleString()} / {capacity.toLocaleString()} kg ({pct}%)
      </span>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>

      {expanded && (
        inventory.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paddy type</th>
                <th>Quantity (kg)</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => (
                <tr key={row.paddy_type}>
                  <td>{row.paddy_type}</td>
                  <td>{Number(row.quantity_kg).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>No stock recorded yet.</p>
        )
      )}
    </div>
  );
}
