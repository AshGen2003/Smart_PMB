/**
 * Modal form for the logged-in warehouse manager to manually add or remove
 * stock of one paddy type (+ optional grade) at their own warehouse.
 * Submits via the adjustMyWarehouseStock Server Action using
 * useActionState — same shape as the officer/admin equivalent,
 * (admin)/warehouses/WarehouseStockAdjustModal.tsx, minus the warehouseId
 * (implicit server-side: a manager only ever has the one warehouse they're
 * appointed to).
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { adjustMyWarehouseStock, type WarehouseManagerFormState } from "@/app/actions/warehouseManager";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "./WarehouseManagerDashboard.module.css";

export type PaddyTypeOption = { id: number; type_name: string };

const GRADE_OPTIONS = [
  { value: "", label: "Any / unspecified" },
  { value: "A", label: "Grade A" },
  { value: "B", label: "Grade B" },
  { value: "C", label: "Grade C" },
];

const initialState: WarehouseManagerFormState = {};

export default function StockAdjustModal({
  direction,
  paddyTypes,
  onClose,
}: {
  direction: "add" | "remove";
  paddyTypes: PaddyTypeOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(adjustMyWarehouseStock, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  const isAdd = direction === "add";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            {isAdd ? <Plus size={20} /> : <Minus size={20} />}
            {isAdd ? "Add stock" : "Remove stock"}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <input type="hidden" name="direction" value={direction} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="paddy_type">Paddy type</label>
              <StyledSelect
                id="paddy_type"
                name="paddy_type"
                placeholder="Select paddy type"
                required
                options={paddyTypes.map((p) => ({ value: String(p.id), label: p.type_name }))}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="grade">
                  Grade <span className={styles.optional}>(optional)</span>
                </label>
                <StyledSelect id="grade" name="grade" defaultValue="" options={GRADE_OPTIONS} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="quantity">Quantity (kg)</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="notes">
                Notes <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="notes"
                name="notes"
                type="text"
                className={styles.input}
                placeholder="Reason for this adjustment"
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Saving…" : isAdd ? "Add to warehouse" : "Remove from warehouse"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
