/**
 * Renders the warehouse manager's dashboard content (hero stats, stock
 * breakdown with add/remove-stock actions, recent movements). Split out
 * from page.tsx (a Server Component) into its own Client Component
 * because the Add/Remove Stock buttons need modal state.
 */
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Minus, Pencil, Plus } from "lucide-react";
import StockAdjustModal, { type PaddyTypeOption } from "./StockAdjustModal";
import WarehouseInfoModal from "./WarehouseInfoModal";
import styles from "./WarehouseManagerDashboard.module.css";

export type WarehouseDetail = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: string;
  contact_number: string;
  district_name: string | null;
  location: string;
  utilization_pct: number;
  remaining_capacity: string;
};

export type InventoryLine = {
  id: number;
  paddy_type_name: string | null;
  grade: string | null;
  quantity: string;
  unit: string;
};

export type TransactionLogEntry = {
  id: number;
  transaction_type: "harvest_collection" | "rice_request_fulfillment" | "manual_adjustment";
  quantity_change: string;
  created_at: string;
};

const TRANSACTION_LABEL: Record<TransactionLogEntry["transaction_type"], string> = {
  harvest_collection: "Harvest collected",
  rice_request_fulfillment: "Rice request fulfilled",
  manual_adjustment: "Manual adjustment",
};

export type AlertRow = {
  id: number;
  alert_type: string;
  level: "info" | "warning" | "critical";
  message: string;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
};

export default function WarehouseManagerDashboardView({
  warehouse,
  inventory,
  transactions,
  alerts,
  paddyTypes,
}: {
  warehouse: WarehouseDetail;
  inventory: InventoryLine[];
  transactions: TransactionLogEntry[];
  alerts: AlertRow[];
  paddyTypes: PaddyTypeOption[];
}) {
  const [adjustDirection, setAdjustDirection] = useState<"add" | "remove" | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const maxQty = Math.max(...inventory.map((i) => Number(i.quantity)), 1);

  return (
    <div className={styles.dashboard}>
      <div className={styles.cardHeader}>
        <div className={styles.header}>
          <h1 className={styles.title}>{warehouse.name}</h1>
          <p className={styles.subtitle}>
            {[warehouse.district_name, warehouse.location].filter(Boolean).join(" · ") || warehouse.code}
          </p>
        </div>
        <button type="button" className={styles.smallBtn} onClick={() => setEditingInfo(true)}>
          <Pencil size={14} /> Edit info
        </button>
      </div>

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
          <span className={styles.heroStatValue}>
            {Number(warehouse.remaining_capacity).toLocaleString()} kg
          </span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Capacity alerts</h2>
          {alerts.map((a) => (
            <div key={a.id} className={styles.alertRow}>
              <AlertTriangle size={16} />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Stock by paddy type</h2>
          <div className={styles.cardActions}>
            <button type="button" className={styles.smallBtn} onClick={() => setAdjustDirection("add")}>
              <Plus size={14} /> Add stock
            </button>
            <button type="button" className={styles.smallBtn} onClick={() => setAdjustDirection("remove")}>
              <Minus size={14} /> Remove stock
            </button>
          </div>
        </div>
        {inventory.length > 0 ? (
          <div className={styles.stockBars}>
            {inventory.map((line) => (
              <div key={line.id} className={styles.stockBarRow}>
                <div className={styles.stockBarLabelRow}>
                  <span>
                    {line.paddy_type_name ?? "—"}
                    {line.grade && <span className={styles.stockBarMeta}> · Grade {line.grade}</span>}
                  </span>
                  <span>
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
          <p className={styles.empty}>No inventory recorded yet.</p>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Recent stock movements</h2>
        {transactions.length > 0 ? (
          <div className={styles.list}>
            {transactions.map((t) => {
              const positive = Number(t.quantity_change) >= 0;
              return (
                <div key={t.id} className={styles.listRow}>
                  <span className={styles.listMain}>
                    {TRANSACTION_LABEL[t.transaction_type]}
                    <span className={styles.listMeta}>
                      {" · "}
                      {format(new Date(t.created_at), "MMM d, yyyy")}
                    </span>
                  </span>
                  <span
                    className={`${styles.listValue} ${
                      positive ? styles.listValuePositive : styles.listValueNegative
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
          <p className={styles.empty}>No stock movements recorded yet.</p>
        )}
      </div>

      {adjustDirection && (
        <StockAdjustModal
          direction={adjustDirection}
          paddyTypes={paddyTypes}
          onClose={() => setAdjustDirection(null)}
        />
      )}

      {editingInfo && (
        <WarehouseInfoModal
          contactNumber={warehouse.contact_number}
          status={warehouse.status}
          onClose={() => setEditingInfo(false)}
        />
      )}
    </div>
  );
}
