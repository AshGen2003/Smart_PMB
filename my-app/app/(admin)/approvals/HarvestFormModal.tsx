"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { ClipboardList, Loader2, X } from "lucide-react";
import { createHarvest, updateHarvest, type HarvestFormState } from "@/app/actions/approvals";
import styles from "./Approvals.module.css";

export type FarmerOption = { id: number; name: string; registration_no: string };
export type PaddyTypeOption = { id: number; type_name: string };
export type WarehouseOption = { id: number; name: string };

export type EditableHarvest = {
  id: number;
  farmer: number;
  paddy_type: number | null;
  warehouse: number | null;
  quantity_kg: string;
  purchase_date: string | null;
  grade: "A" | "B" | "C" | null;
  moisture_level: string | null;
  quality_check: boolean | null;
  unit_price: string | null;
};

const initialState: HarvestFormState = {};

export default function HarvestFormModal({
  mode,
  harvest,
  farmers,
  paddyTypes,
  warehouses,
  onClose,
}: {
  mode: "create" | "edit";
  harvest?: EditableHarvest;
  farmers: FarmerOption[];
  paddyTypes: PaddyTypeOption[];
  warehouses: WarehouseOption[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createHarvest : updateHarvest.bind(null, harvest!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <ClipboardList size={20} />
            {mode === "create" ? "Add harvest" : "Edit harvest"}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="farmer">Farmer</label>
              <select
                id="farmer"
                name="farmer"
                required
                defaultValue={harvest?.farmer ?? ""}
                className={styles.input}
              >
                <option value="" disabled>Select farmer</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.registration_no})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="paddy_type">Paddy type</label>
                <select
                  id="paddy_type"
                  name="paddy_type"
                  defaultValue={harvest?.paddy_type ?? ""}
                  className={styles.input}
                >
                  <option value="">Select paddy type</option>
                  {paddyTypes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="warehouse">Warehouse</label>
                <select
                  id="warehouse"
                  name="warehouse"
                  defaultValue={harvest?.warehouse ?? ""}
                  className={styles.input}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="quantity_kg">Quantity (kg)</label>
                <input
                  id="quantity_kg"
                  name="quantity_kg"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={harvest?.quantity_kg}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="purchase_date">Purchase date</label>
                <input
                  id="purchase_date"
                  name="purchase_date"
                  type="date"
                  defaultValue={harvest?.purchase_date ?? ""}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="grade">Grade</label>
                <select
                  id="grade"
                  name="grade"
                  defaultValue={harvest?.grade ?? ""}
                  className={styles.input}
                >
                  <option value="">Not assessed</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="moisture_level">Moisture (%)</label>
                <input
                  id="moisture_level"
                  name="moisture_level"
                  type="number"
                  step="0.01"
                  defaultValue={harvest?.moisture_level ?? ""}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="unit_price">Unit price (Rs./kg)</label>
              <input
                id="unit_price"
                name="unit_price"
                type="number"
                step="0.01"
                defaultValue={harvest?.unit_price ?? ""}
                className={styles.input}
              />
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                name="quality_check"
                defaultChecked={harvest?.quality_check ?? false}
                className={styles.checkbox}
              />
              Quality check passed
            </label>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
