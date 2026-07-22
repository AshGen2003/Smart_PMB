/**
 * Modal dialog with the create/edit form for a warehouse. Submits via a
 * Server Action (createWarehouse/updateWarehouse) using useActionState.
 */
"use client";

import React, { useEffect, useMemo, useRef, useActionState } from "react";
import { Loader2, Warehouse as WarehouseIcon, X } from "lucide-react";
import {
  createWarehouse,
  updateWarehouse,
  type WarehouseFormState,
} from "@/app/actions/warehouses";
import styles from "./Warehouses.module.css";

export type DistrictOption = {
  id: number;
  name: string;
  province: { name: string } | null;
};

/** Subset of warehouse fields needed to pre-fill the form when editing. */
export type EditableWarehouse = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  status: string;
  contact_number: string;
  established_date: string | null;
  district: number | null;
  location: string;
};

const initialState: WarehouseFormState = {};

/**
 * Renders the warehouse form inside a modal overlay. Picks createWarehouse
 * or updateWarehouse (with the id bound in) based on `mode`, and closes
 * itself once the save succeeds.
 */
export default function WarehouseFormModal({
  mode,
  warehouse,
  districts,
  onClose,
}: {
  mode: "create" | "edit";
  warehouse?: EditableWarehouse;
  districts: DistrictOption[];
  onClose: () => void;
}) {
  const action =
    mode === "create" ? createWarehouse : updateWarehouse.bind(null, warehouse!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasSubmitting = useRef(false);

  // Auto-close the modal once a pending submission resolves without error.
  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  // Group districts under their province name so the <select> can render
  // them as <optgroup>s instead of one long flat list.
  const districtsByProvince = useMemo(() => {
    const groups = new Map<string, DistrictOption[]>();
    for (const d of districts) {
      const province = d.province?.name ?? "Other";
      if (!groups.has(province)) groups.set(province, []);
      groups.get(province)!.push(d);
    }
    return groups;
  }, [districts]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <WarehouseIcon size={20} />
            {mode === "create" ? "New warehouse" : `Edit warehouse — ${warehouse?.name}`}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  defaultValue={warehouse?.name}
                  className={styles.input}
                  placeholder="e.g. Anuradhapura Central"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="code">Code</label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  defaultValue={warehouse?.code}
                  className={styles.input}
                  placeholder="e.g. WH-001"
                />
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="capacity">Capacity (kg)</label>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={warehouse?.capacity}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  defaultValue={warehouse?.status ?? "active"}
                  className={styles.input}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="full">Full</option>
                  <option value="under_maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="contact_number">Contact number</label>
                <input
                  id="contact_number"
                  name="contact_number"
                  type="text"
                  defaultValue={warehouse?.contact_number}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="established_date">Established</label>
                <input
                  id="established_date"
                  name="established_date"
                  type="date"
                  defaultValue={warehouse?.established_date ?? ""}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="district">District</label>
              <select
                id="district"
                name="district"
                defaultValue={warehouse?.district ?? ""}
                className={styles.input}
              >
                <option value="">Select district</option>
                {Array.from(districtsByProvince.entries()).map(([province, items]) => (
                  <optgroup key={province} label={province}>
                    {items.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="location">
                Location <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={warehouse?.location}
                className={styles.input}
                placeholder="Street address"
              />
            </div>

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
