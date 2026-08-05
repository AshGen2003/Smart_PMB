/**
 * Two-step inline form for an Authorized Purchaser to record a direct
 * at-source purchase: look up a farmer by NIC (purchases.views.
 * FarmerNicLookupView, scoped/narrow — id, name, reliability, seasonal
 * quota only), then record the weight bought at that paddy type's
 * guaranteed price. Mirrors mill-owner/milling-allocations/
 * MillingAllocationForm.tsx for the record-and-reset shape, but needs its
 * own local state (not useActionState) because the farmer lookup is a
 * separate round-trip before the purchase can even be submitted.
 */
"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Search, Send } from "lucide-react";
import { lookupFarmerByNic, submitFarmGatePurchase, type FarmerLookupResult } from "@/app/actions/purchases";
import styles from "./FarmGatePurchases.module.css";

export type PaddyTypeOption = { id: number; type_name: string };

export default function FarmGatePurchaseForm({ paddyTypes }: { paddyTypes: PaddyTypeOption[] }) {
  const [nic, setNic] = useState("");
  const [farmer, setFarmer] = useState<FarmerLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLookingUp, startLookup] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  function handleLookup() {
    const trimmed = nic.trim();
    if (!trimmed) return;
    setLookupError(null);
    setFarmer(null);
    startLookup(async () => {
      const result = await lookupFarmerByNic(trimmed);
      if (result.error) setLookupError(result.error);
      else setFarmer(result.farmer ?? null);
    });
  }

  function handleSubmit(formData: FormData) {
    if (!farmer) return;
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitFarmGatePurchase(farmer.id, formData);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      setNic("");
      setFarmer(null);
    });
  }

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formCardTitle}>Record a farm-gate purchase</h3>
      <p className={styles.subtitle}>
        Look up a farmer by NIC, then record a direct at-source purchase at that paddy type&apos;s guaranteed price.
      </p>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nic">Farmer NIC</label>
          <input
            id="nic"
            className={styles.input}
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            placeholder="e.g. 991234567V"
          />
        </div>
        <button
          type="button"
          className={styles.submitBtn}
          disabled={isLookingUp || !nic.trim()}
          onClick={handleLookup}
        >
          {isLookingUp ? <Loader2 size={16} className={styles.spin} /> : <Search size={16} />}
          Look up
        </button>
      </div>

      {lookupError && <div className={styles.banner}>{lookupError}</div>}

      {farmer && (
        <>
          <div className={styles.farmerCard}>
            <span className={styles.farmerCardName}>{farmer.name} ({farmer.registration_no})</span>
            <span>Reliability score: {farmer.reliability_score}</span>
            <span>
              Season quota: {farmer.quota.quota_used_kg.toLocaleString()} kg used
              {farmer.quota.max_quota_kg !== null && ` of ${farmer.quota.max_quota_kg.toLocaleString()} kg`}
              {farmer.quota.quota_remaining_kg !== null &&
                ` — ${farmer.quota.quota_remaining_kg.toLocaleString()} kg remaining`}
            </span>
          </div>

          {submitError && <div className={styles.banner}>{submitError}</div>}

          <form action={handleSubmit} noValidate>
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
                <label className={styles.label} htmlFor="weight_kg">Weight (kg)</label>
                <input
                  id="weight_kg"
                  name="weight_kg"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className={styles.input}
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
                {isSubmitting ? "Recording…" : "Record purchase"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
