/**
 * Inline (non-modal) form for an Authorized Purchaser to request a
 * quantity of a given rice/paddy type. Submits via the submitRiceRequest
 * Server Action using useActionState. Mirrors the shape of
 * partner/milling-reports/MillingReportForm.tsx.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitRiceRequest, type PurchaseRequestFormState } from "@/app/actions/purchases";
import formStyles from "@/app/components/SettingsSections.module.css";

export type PaddyTypeOption = { id: number; type_name: string };

const initialState: PurchaseRequestFormState = {};

export default function RequestRiceForm({ paddyTypes }: { paddyTypes: PaddyTypeOption[] }) {
  const [state, formAction, pending] = useActionState(submitRiceRequest, initialState);
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
    <div className={formStyles.card}>
      <h3 className={formStyles.cardTitle}>Request rice</h3>
      <p className={formStyles.cardSubtitle}>
        Ask for a specific rice type and quantity. A PMB officer will review and fulfill it from warehouse stock.
      </p>

      {state.error && <div className={`${formStyles.banner} ${formStyles.bannerError}`}>{state.error}</div>}

      <form action={formAction} ref={formRef} noValidate>
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="paddy_type">Rice type</label>
          <select id="paddy_type" name="paddy_type" required className={formStyles.input} defaultValue="">
            <option value="" disabled>Select a rice type</option>
            {paddyTypes.map((p) => (
              <option key={p.id} value={p.id}>{p.type_name}</option>
            ))}
          </select>
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor="quantity_kg">Quantity (kg)</label>
          <input
            id="quantity_kg"
            name="quantity_kg"
            type="number"
            step="0.01"
            min="0.01"
            required
            className={formStyles.input}
          />
        </div>

        <button type="submit" className={formStyles.submitBtn} disabled={pending}>
          {pending ? <Loader2 size={16} className={formStyles.spin} /> : <Send size={16} />}
          {pending ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
