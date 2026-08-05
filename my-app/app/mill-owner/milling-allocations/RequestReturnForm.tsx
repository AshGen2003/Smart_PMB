/**
 * Small inline form, shown under a fulfilled allocation's row, for a mill
 * owner to request that the milled rice be transported back to a PMB
 * warehouse. Binds `allocationId` into the requestMillingReturn Server
 * Action so useActionState only has to manage the remaining fields.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { requestMillingReturn, type MillFormState } from "@/app/actions/mills";
import styles from "./MillingAllocations.module.css";

export type WarehouseOption = { id: number; name: string };

const initialState: MillFormState = {};

export default function RequestReturnForm({
  allocationId,
  warehouses,
  onDone,
}: {
  allocationId: number;
  warehouses: WarehouseOption[];
  onDone: () => void;
}) {
  const boundAction = requestMillingReturn.bind(null, allocationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onDone();
    }
  }, [pending, state, onDone]);

  return (
    <div>
      {state.error && <div className={styles.banner}>{state.error}</div>}
      <form action={formAction} ref={formRef} className={styles.returnForm} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`destination_warehouse_${allocationId}`}>
            Destination warehouse
          </label>
          <select
            id={`destination_warehouse_${allocationId}`}
            name="destination_warehouse"
            required
            className={styles.input}
            defaultValue=""
          >
            <option value="" disabled>Select a warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`rice_kg_${allocationId}`}>Rice quantity (kg)</label>
          <input
            id={`rice_kg_${allocationId}`}
            name="rice_kg"
            type="number"
            step="0.01"
            min="0.01"
            required
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
          {pending ? "Submitting…" : "Request return"}
        </button>
      </form>
    </div>
  );
}
