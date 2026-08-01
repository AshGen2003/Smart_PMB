/**
 * Modal dialog for a farmer to submit a new harvest delivery. Only asks for
 * paddy type and quantity — everything else (grade, price, warehouse) is
 * filled in later by an officer during approval. Submits via the
 * submitHarvest Server Action using useActionState, mirroring the
 * create/edit modal pattern in (admin)/approvals/HarvestFormModal.tsx.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Sprout, Loader2, X } from "lucide-react";
import { submitHarvest, type HarvestFormState } from "@/app/actions/farmer";
import styles from "./Harvests.module.css";

export type PaddyTypeOption = { id: number; type_name: string };

const initialState: HarvestFormState = {};

export default function LogHarvestModal({
  paddyTypes,
  onClose,
}: {
  paddyTypes: PaddyTypeOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(submitHarvest, initialState);
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
            <Sprout size={20} />
            Log harvest
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="paddy_type">Paddy type</label>
              <select id="paddy_type" name="paddy_type" required className={styles.input} defaultValue="">
                <option value="" disabled>Select paddy type</option>
                {paddyTypes.map((p) => (
                  <option key={p.id} value={p.id}>{p.type_name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="quantity_kg">Quantity (kg)</label>
              <input
                id="quantity_kg"
                name="quantity_kg"
                type="number"
                step="0.01"
                min="0"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
