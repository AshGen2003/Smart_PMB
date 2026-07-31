/**
 * Warehouse Manager's single-step intake form: farmer, paddy type,
 * quantity, unit price, and a target warehouse (limited to the manager's
 * own). Shows a live current-vs-projected utilization preview computed
 * from the already-fetched warehouse capacity/stock, and blocks submit
 * client-side if it would overflow capacity (the server independently
 * re-checks and rejects with 400 either way — see WarehouseIntakeView).
 */
"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { submitWarehouseIntake, type IntakeFormState } from "@/app/actions/warehouseManager";
import styles from "@/app/components/SettingsSections.module.css";

type WarehouseOption = { id: number; name: string; code: string; capacity: string; current_stock: string };
type FarmerOption = { id: number; name: string; registration_no: string };
type PaddyTypeOption = { id: number; type_name: string };

const initialState: IntakeFormState = {};

export default function IntakeForm({
  warehouses,
  farmers,
  paddyTypes,
}: {
  warehouses: WarehouseOption[];
  farmers: FarmerOption[];
  paddyTypes: PaddyTypeOption[];
}) {
  const [state, formAction, pending] = useActionState(submitWarehouseIntake, initialState);
  const [warehouseId, setWarehouseId] = useState<string | number>(warehouses[0]?.id ?? "");
  const [quantityKg, setQuantityKg] = useState("");

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => String(w.id) === String(warehouseId)),
    [warehouses, warehouseId]
  );

  const capacity = Number(selectedWarehouse?.capacity ?? 0);
  const currentStock = Number(selectedWarehouse?.current_stock ?? 0);
  const projected = currentStock + (Number(quantityKg) || 0);
  const projectedPct = capacity ? Math.min(999, Math.round((projected / capacity) * 100)) : 0;
  const currentPct = capacity ? Math.min(100, Math.round((currentStock / capacity) * 100)) : 0;
  const wouldOverflow = capacity > 0 && projected > capacity;

  if (warehouses.length === 0) {
    return (
      <div className={styles.card}>
        <p className={styles.cardSubtitle}>
          No warehouse assigned yet — contact an officer to be linked to a warehouse before recording intake.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>New intake</h2>

      {state.error && <div className={clsx(styles.banner, styles.bannerError)}>{state.error}</div>}
      {state.success && <div className={clsx(styles.banner, styles.bannerSuccess)}>Intake recorded.</div>}

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="warehouseId">Warehouse</label>
          <select
            id="warehouseId"
            name="warehouseId"
            className={styles.input}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            required
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="farmerId">Farmer</label>
            <select id="farmerId" name="farmerId" className={styles.input} required defaultValue="">
              <option value="" disabled>Select farmer</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.registration_no})</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="paddyTypeId">Paddy type</label>
            <select id="paddyTypeId" name="paddyTypeId" className={styles.input} required defaultValue="">
              <option value="" disabled>Select paddy type</option>
              {paddyTypes.map((p) => (
                <option key={p.id} value={p.id}>{p.type_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="quantityKg">Quantity (kg)</label>
            <input
              id="quantityKg"
              name="quantityKg"
              type="number"
              step="0.01"
              min="0"
              required
              className={styles.input}
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="unitPrice">Unit price (Rs./kg)</label>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              step="0.01"
              min="0"
              required
              className={styles.input}
            />
          </div>
        </div>

        {selectedWarehouse && quantityKg && (
          <div className={styles.field}>
            <label className={styles.label}>
              Utilization preview: {currentPct}% → {projectedPct}%
              {wouldOverflow && " — exceeds capacity"}
            </label>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 9999,
                background: "var(--sidebar-hover)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, projectedPct)}%`,
                  height: "100%",
                  borderRadius: 9999,
                  background: wouldOverflow ? "var(--danger)" : "var(--gradient-brand)",
                }}
              />
            </div>
          </div>
        )}

        <button type="submit" className={styles.submitBtn} disabled={pending || wouldOverflow}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Recording…" : "Record intake"}
        </button>
      </form>
    </div>
  );
}
