/**
 * Real-time milling conversion-ratio calculator: given a raw paddy input
 * weight and whether it's being milled raw or parboiled, shows the
 * expected rice/husk/bran output using the PMB standard recovery rates
 * (see app/lib/pmbConstants.ts). Pure client-side estimate — the actual
 * figures a mill owner records still go through the form below via
 * MillingReportForm, which is the source of truth once submitted.
 */
"use client";

import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { MILLING_RECOVERY_RATES, type MillingPaddyKind } from "@/app/lib/pmbConstants";
import styles from "./MillingReports.module.css";

export default function MillingCalculator() {
  const [paddyKg, setPaddyKg] = useState("");
  const [kind, setKind] = useState<MillingPaddyKind>("raw");

  const output = useMemo(() => {
    const input = parseFloat(paddyKg);
    if (Number.isNaN(input) || input <= 0) return null;
    const rates = MILLING_RECOVERY_RATES[kind];
    return {
      rice: input * rates.rice,
      husk: input * rates.husk,
      bran: input * rates.bran,
    };
  }, [paddyKg, kind]);

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formCardTitle}>
        <Calculator size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
        Conversion ratio calculator
      </h3>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="calc_paddy_kg">Raw paddy (kg)</label>
          <input
            id="calc_paddy_kg"
            type="number"
            step="0.01"
            min="0"
            value={paddyKg}
            onChange={(e) => setPaddyKg(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="calc_kind">Milling type</label>
          <select
            id="calc_kind"
            className={styles.input}
            value={kind}
            onChange={(e) => setKind(e.target.value as MillingPaddyKind)}
          >
            <option value="raw">Raw (~{Math.round(MILLING_RECOVERY_RATES.raw.rice * 100)}% recovery)</option>
            <option value="parboiled">Parboiled (~{Math.round(MILLING_RECOVERY_RATES.parboiled.rice * 100)}% recovery)</option>
          </select>
        </div>
      </div>

      {output ? (
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <span className={styles.label}>Expected rice</span>
            <div className={styles.input} style={{ fontWeight: 700 }}>{output.rice.toFixed(1)} kg</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Expected husk</span>
            <div className={styles.input}>{output.husk.toFixed(1)} kg</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Expected bran</span>
            <div className={styles.input}>{output.bran.toFixed(1)} kg</div>
          </div>
        </div>
      ) : (
        <p className={styles.subtitle}>Enter a raw paddy weight to see the expected yield.</p>
      )}
    </div>
  );
}
