/**
 * Modal dialog with the create/edit form for a harvest purchase record.
 * Submits via a Server Action (createHarvest/updateHarvest) using React's
 * useActionState so the form works with progressive enhancement and shows
 * a pending/error state without manual fetch/try-catch wiring.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { ClipboardList, Loader2, X } from "lucide-react";
import { createHarvest, updateHarvest, type HarvestFormState } from "@/app/actions/approvals";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "./Approvals.module.css";

export type FarmerOption = { id: number; name: string; registration_no: string };
export type PaddyTypeOption = { id: number; type_name: string };
export type WarehouseOption = { id: number; name: string };

/** Subset of harvest fields needed to pre-fill the form when editing. */
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

/**
 * Renders the harvest form inside a modal overlay. In "create" mode it
 * posts to `createHarvest`; in "edit" mode it binds the harvest id and
 * posts to `updateHarvest`. Closes itself automatically once the action
 * completes successfully.
 */
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
  // Pick the right Server Action for the mode; updateHarvest needs the
  // record id bound in ahead of time since <form action> only passes FormData.
  const action = mode === "create" ? createHarvest : updateHarvest.bind(null, harvest!.id);
  // useActionState wires the form to the Server Action: `state` holds the
  // last returned value (e.g. { error }), `formAction` goes on the <form>,
  // and `pending` is true while the action is in flight.
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasSubmitting = useRef(false);

  // Once a submission that was pending finishes without an error, close the
  // modal automatically (mirrors a successful save-and-close UX).
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
              <StyledSelect
                id="farmer"
                name="farmer"
                required
                defaultValue={harvest?.farmer != null ? String(harvest.farmer) : undefined}
                placeholder="Select farmer"
                options={farmers.map((f) => ({ value: String(f.id), label: `${f.name} (${f.registration_no})` }))}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="paddy_type">Paddy type</label>
                <StyledSelect
                  id="paddy_type"
                  name="paddy_type"
                  defaultValue={harvest?.paddy_type != null ? String(harvest.paddy_type) : ""}
                  placeholder="Select paddy type"
                  options={paddyTypes.map((p) => ({ value: String(p.id), label: p.type_name }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="warehouse">Warehouse</label>
                <StyledSelect
                  id="warehouse"
                  name="warehouse"
                  defaultValue={harvest?.warehouse != null ? String(harvest.warehouse) : ""}
                  placeholder="Select warehouse"
                  options={warehouses.map((w) => ({ value: String(w.id), label: w.name }))}
                />
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
                <StyledSelect
                  id="grade"
                  name="grade"
                  defaultValue={harvest?.grade ?? ""}
                  options={[
                    { value: "", label: "Not assessed" },
                    { value: "A", label: "Grade A" },
                    { value: "B", label: "Grade B" },
                    { value: "C", label: "Grade C" },
                  ]}
                />
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
