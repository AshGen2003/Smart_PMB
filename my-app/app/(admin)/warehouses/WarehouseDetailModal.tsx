/**
 * Read-only modal showing one warehouse's detailed stock breakdown
 * (Inventory, per paddy type/grade) and recent stock movements
 * (TransactionLog) — additive telemetry alongside the card grid's single
 * current_stock number. Data is fetched once for all warehouses by the
 * page and filtered client-side here, same shape as the create/edit
 * modal it sits alongside (WarehouseFormModal.tsx).
 */
"use client";

import React from "react";
import { format } from "date-fns";
import { ClipboardList, Warehouse as WarehouseIcon, X } from "lucide-react";
import styles from "./Warehouses.module.css";

export type InventoryLine = {
  id: number;
  warehouse: number;
  paddy_type_name: string | null;
  grade: string | null;
  quantity: string;
  unit: string;
};

export type TransactionLogEntry = {
  id: number;
  warehouse: number;
  transaction_type: "harvest_collection" | "rice_request_fulfillment" | "manual_adjustment";
  quantity_change: string;
  created_at: string;
};

const TRANSACTION_LABEL: Record<TransactionLogEntry["transaction_type"], string> = {
  harvest_collection: "Harvest collected",
  rice_request_fulfillment: "Rice request fulfilled",
  manual_adjustment: "Manual adjustment",
};

export default function WarehouseDetailModal({
  warehouseName,
  inventory,
  transactions,
  onClose,
}: {
  warehouseName: string;
  inventory: InventoryLine[];
  transactions: TransactionLogEntry[];
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <WarehouseIcon size={20} />
            Stock detail — {warehouseName}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <h3 className={styles.detailSectionTitle}>Inventory by paddy type</h3>
          {inventory.length > 0 ? (
            <div className={styles.detailList}>
              {inventory.map((line) => (
                <div key={line.id} className={styles.detailListRow}>
                  <span className={styles.detailListMain}>
                    {line.paddy_type_name ?? "—"}
                    {line.grade && <span className={styles.detailListMeta}> · Grade {line.grade}</span>}
                  </span>
                  <span className={styles.detailListValue}>
                    {Number(line.quantity).toLocaleString()} {line.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.detailEmpty}>No inventory recorded yet.</p>
          )}

          <h3 className={styles.detailSectionTitle}>Recent stock movements</h3>
          {transactions.length > 0 ? (
            <div className={styles.detailList}>
              {transactions.slice(0, 10).map((t) => {
                const positive = Number(t.quantity_change) >= 0;
                return (
                  <div key={t.id} className={styles.detailListRow}>
                    <span className={styles.detailListMain}>
                      {TRANSACTION_LABEL[t.transaction_type]}
                      <span className={styles.detailListMeta}>
                        {" · "}
                        {format(new Date(t.created_at), "MMM d, yyyy")}
                      </span>
                    </span>
                    <span
                      className={`${styles.detailListValue} ${
                        positive ? styles.detailListValuePositive : styles.detailListValueNegative
                      }`}
                    >
                      {positive ? "+" : ""}
                      {Number(t.quantity_change).toLocaleString()} kg
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.detailEmpty}>
              <ClipboardList size={14} style={{ verticalAlign: "text-bottom", marginRight: "0.3rem" }} />
              No stock movements recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
