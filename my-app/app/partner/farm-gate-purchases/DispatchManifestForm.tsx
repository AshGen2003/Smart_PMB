/**
 * Inline form shown once a purchaser has selected one or more unassigned
 * FarmGatePurchase rows: pick a destination warehouse and bundle the
 * selection into a new DispatchManifest. Mirrors mill-owner/
 * milling-allocations/RequestReturnForm.tsx's bound-id shape, but binds an
 * array of purchase ids (the current checkbox selection) instead of one.
 */
"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { createDispatchManifest } from "@/app/actions/purchases";
import styles from "./FarmGatePurchases.module.css";

export type WarehouseOption = { id: number; name: string };

export default function DispatchManifestForm({
  purchaseIds,
  warehouses,
  onDone,
}: {
  purchaseIds: number[];
  warehouses: WarehouseOption[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createDispatchManifest(purchaseIds, formData);
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div>
      {error && <div className={styles.banner}>{error}</div>}
      <form action={handleSubmit} className={styles.fieldRow} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="destination_warehouse">Destination warehouse</label>
          <select id="destination_warehouse" name="destination_warehouse" required className={styles.input} defaultValue="">
            <option value="" disabled>Select a warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={styles.submitBtn} disabled={isPending}>
          {isPending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
          {isPending ? "Creating…" : `Create manifest (${purchaseIds.length} purchase${purchaseIds.length === 1 ? "" : "s"})`}
        </button>
      </form>
    </div>
  );
}
