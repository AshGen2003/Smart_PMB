/**
 * Inline (non-modal) form for a mill owner to request a raw-paddy
 * allocation from a PMB warehouse: paddy type and quantity. Submits via
 * the requestMillingAllocation Server Action using useActionState.
 * Mirrors milling-reports/MillingReportForm.tsx.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { requestMillingAllocation, type MillFormState } from "@/app/actions/mills";
import styles from "./MillingAllocations.module.css";

export type PaddyTypeOption = { id: number; type_name: string };

const initialState: MillFormState = {};

export default function MillingAllocationForm({ paddyTypes }: { paddyTypes: PaddyTypeOption[] }) {
  const [state, formAction, pending] = useActionState(requestMillingAllocation, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      formRef.current?.reset();
      wasSubmitting.current = false;
    }
  }, [pending, state]);

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formCardTitle}>Request paddy allocation</h3>
      <p className={styles.subtitle}>
        Ask for a specific paddy type and quantity to be allocated from a PMB warehouse for milling. A PMB officer
        will review and fulfill it.
      </p>

      {state.error && <div className={styles.banner}>{state.error}</div>}

      <form action={formAction} ref={formRef} noValidate>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="paddy_type">Paddy type</label>
            <select id="paddy_type" name="paddy_type" required className={styles.input} defaultValue="">
              <option value="" disabled>Select a paddy type</option>
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
              min="0.01"
              required
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
          {pending ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
