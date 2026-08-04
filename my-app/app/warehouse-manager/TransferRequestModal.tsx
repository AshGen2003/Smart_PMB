/**
 * Modal form for the logged-in warehouse manager to request a transfer of
 * stock (one paddy type + optional grade) from another warehouse into
 * their own. Submits via the requestWarehouseTransfer Server Action —
 * same useActionState shape as StockAdjustModal.tsx. The destination is
 * always the manager's own warehouse (forced server-side), so this form
 * only ever collects the source warehouse and what to move.
 */
"use client";

import React, { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { ArrowRightLeft, Loader2, X } from "lucide-react";
import { requestWarehouseTransfer, type WarehouseManagerFormState } from "@/app/actions/warehouseManager";
import StyledSelect from "@/app/components/StyledSelect";
import type { PaddyTypeOption } from "./StockAdjustModal";
import styles from "./WarehouseManagerDashboard.module.css";

export type TransferWarehouseOption = { id: number; name: string; district_name: string | null };

export type TransferInventoryLine = {
  warehouse: number;
  paddy_type: number;
  grade: string | null;
  quantity: string;
};

const GRADE_OPTIONS = [
  { value: "", label: "Any / unspecified" },
  { value: "A", label: "Grade A" },
  { value: "B", label: "Grade B" },
  { value: "C", label: "Grade C" },
];

const initialState: WarehouseManagerFormState = {};

export default function TransferRequestModal({
  warehouses,
  inventory,
  paddyTypes,
  onClose,
}: {
  warehouses: TransferWarehouseOption[];
  inventory: TransferInventoryLine[];
  paddyTypes: PaddyTypeOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(requestWarehouseTransfer, initialState);
  const wasSubmitting = useRef(false);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [paddyType, setPaddyType] = useState("");
  const [grade, setGrade] = useState("");

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  const available = useMemo(() => {
    if (!fromWarehouse || !paddyType) return null;
    const line = inventory.find(
      (i) =>
        String(i.warehouse) === fromWarehouse &&
        String(i.paddy_type) === paddyType &&
        (i.grade ?? "") === grade
    );
    return line ? Number(line.quantity) : 0;
  }, [inventory, fromWarehouse, paddyType, grade]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <ArrowRightLeft size={20} />
            Request transfer
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="from_warehouse">From warehouse</label>
              <StyledSelect
                id="from_warehouse"
                name="from_warehouse"
                placeholder="Select source warehouse"
                required
                value={fromWarehouse}
                onChange={setFromWarehouse}
                options={warehouses.map((w) => ({
                  value: String(w.id),
                  label: w.district_name ? `${w.name} (${w.district_name})` : w.name,
                }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="paddy_type">Paddy type</label>
              <StyledSelect
                id="paddy_type"
                name="paddy_type"
                placeholder="Select paddy type"
                required
                value={paddyType}
                onChange={setPaddyType}
                options={paddyTypes.map((p) => ({ value: String(p.id), label: p.type_name }))}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="grade">
                  Grade <span className={styles.optional}>(optional)</span>
                </label>
                <StyledSelect
                  id="grade"
                  name="grade"
                  defaultValue=""
                  value={grade}
                  onChange={setGrade}
                  options={GRADE_OPTIONS}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="quantity_kg">Quantity (kg)</label>
                <input
                  id="quantity_kg"
                  name="quantity_kg"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            {available !== null && (
              <p className={styles.optional}>{available.toLocaleString()} kg available at the selected warehouse.</p>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="notes">
                Notes <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="notes"
                name="notes"
                type="text"
                className={styles.input}
                placeholder="Reason for this transfer"
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
