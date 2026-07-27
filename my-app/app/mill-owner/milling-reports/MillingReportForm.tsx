/**
 * Inline (non-modal) form for a mill owner to submit a new milling report:
 * paddy processed, rice output, and optional notes. Submits via the
 * submitMillingReport Server Action using useActionState.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitMillingReport, type MillFormState } from "@/app/actions/mills";
import styles from "./MillingReports.module.css";

const initialState: MillFormState = {};

export default function MillingReportForm() {
  const [state, formAction, pending] = useActionState(submitMillingReport, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  // Reset the form once a submission that was pending finishes successfully.
  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      formRef.current?.reset();
      wasSubmitting.current = false;
    }
  }, [pending, state]);

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formCardTitle}>Submit milling report</h3>

      {state.error && <div className={styles.banner}>{state.error}</div>}

      <form action={formAction} ref={formRef}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="paddy_processed_kg">Paddy processed (kg)</label>
            <input
              id="paddy_processed_kg"
              name="paddy_processed_kg"
              type="number"
              step="0.01"
              min="0"
              required
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rice_output_kg">Rice output (kg)</label>
            <input
              id="rice_output_kg"
              name="rice_output_kg"
              type="number"
              step="0.01"
              min="0"
              required
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="notes">Notes (optional)</label>
            <input id="notes" name="notes" type="text" className={styles.input} />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
          {pending ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}
