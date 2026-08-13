/**
 * Modal showing one warehouse's hero stock stats (capacity/current
 * stock/utilization/remaining), a stock-by-paddy-type breakdown, and
 * recent stock movements (TransactionLog) — additive telemetry alongside
 * the card grid's single current_stock number. Data is fetched once for
 * all warehouses by the page and filtered client-side here, same shape as
 * the create/edit modal it sits alongside (WarehouseFormModal.tsx).
 */
"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ClipboardList, UserCog, Warehouse as WarehouseIcon, X } from "lucide-react";
import AppointWarehouseManagerModal, { type ManagerOption } from "./AppointWarehouseManagerModal";
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
  rice_request_fulfillment: "Paddy request fulfilled",
  manual_adjustment: "Manual adjustment",
};

/** Minimal subset of WarehousesManager's WarehouseRow needed for the hero stats — kept local to avoid a circular type import. */
export type WarehouseSummary = {
  id: number;
  name: string;
  capacity: string;
  current_stock: string;
  utilization_pct: number;
  remaining_capacity: string;
  managed_by_name: string | null;
};

export default function WarehouseDetailModal({
  warehouse,
  inventory,
  transactions,
  managers,
  permissions,
  canWrite,
  onClose,
}: {
  warehouse: WarehouseSummary;
  inventory: InventoryLine[];
  transactions: TransactionLogEntry[];
  managers: ManagerOption[];
  permissions: string[];
  canWrite: boolean;
  onClose: () => void;
}) {
  const [appointing, setAppointing] = useState(false);
  const maxQty = Math.max(...inventory.map((i) => Number(i.quantity)), 1);
  const canAppoint = canWrite && permissions.includes("appoint_warehouse_managers");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <WarehouseIcon size={20} />
            Stock detail — {warehouse.name}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Capacity</span>
              <span className={styles.heroStatValue}>{Number(warehouse.capacity).toLocaleString()} kg</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Current stock</span>
              <span className={styles.heroStatValue}>{Number(warehouse.current_stock).toLocaleString()} kg</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Utilization</span>
              <span className={styles.heroStatValue}>{warehouse.utilization_pct}%</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Remaining</span>
              <span className={styles.heroStatValue}>{Number(warehouse.remaining_capacity).toLocaleString()} kg</span>
            </div>
          </div>

          <div className={styles.detailListRow} style={{ marginBottom: "0.5rem" }}>
            <span className={styles.detailListMain}>
              Managed by <span className={styles.detailListMeta}>{warehouse.managed_by_name ?? "Unassigned"}</span>
            </span>
            {canAppoint && (
              <button
                type="button"
                className={styles.editBtn}
                style={{ flex: "0 0 auto" }}
                onClick={() => setAppointing(true)}
              >
                <UserCog size={14} /> {warehouse.managed_by_name ? "Reassign" : "Appoint"} manager
              </button>
            )}
          </div>

          <h3 className={styles.detailSectionTitle}>Stock by paddy type</h3>
          {inventory.length > 0 ? (
            <div className={styles.stockBars}>
              {inventory.map((line) => (
                <div key={line.id} className={styles.stockBarRow}>
                  <div className={styles.stockBarLabelRow}>
                    <span>
                      {line.paddy_type_name ?? "—"}
                      {line.grade && <span className={styles.detailListMeta}> · Grade {line.grade}</span>}
                    </span>
                    <span className={styles.detailListValue}>
                      {Number(line.quantity).toLocaleString()} {line.unit}
                    </span>
                  </div>
                  <div className={styles.stockBarTrack}>
                    <div
                      className={styles.stockBarFill}
                      style={{ width: `${(Number(line.quantity) / maxQty) * 100}%` }}
                    />
                  </div>
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

      {appointing && (
        <AppointWarehouseManagerModal
          warehouseId={warehouse.id}
          warehouseName={warehouse.name}
          existingManagers={managers}
          onClose={() => setAppointing(false)}
        />
      )}
    </div>
  );
}
