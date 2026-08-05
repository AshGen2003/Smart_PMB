/**
 * Officer-facing editor for each Authorized Purchaser's buying weight limit
 * and government advance (purchases.AuthorizedPurchaser). A sibling section
 * to PurchaseRequestsManager on the same page — that table is one row per
 * RiceRequest, this one is one row per purchaser, so it's kept as its own
 * component rather than another tab on the request table.
 */
"use client";

import React, { useActionState } from "react";
import { Loader2, Users } from "lucide-react";
import { updatePurchaserLimits, type PurchaserLimitsFormState } from "@/app/actions/purchaser-limits";
import styles from "./PurchaseRequests.module.css";

export type PurchaserRow = {
  id: number;
  organization: string;
  reg_number: string;
  district_name: string | null;
  weight_limit_kg: string | null;
  advance_amount: string | null;
};

const initialState: PurchaserLimitsFormState = {};

function PurchaserLimitRow({ purchaser }: { purchaser: PurchaserRow }) {
  const action = updatePurchaserLimits.bind(null, purchaser.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <tr>
      <td>{purchaser.organization}</td>
      <td>{purchaser.reg_number || "—"}</td>
      <td>{purchaser.district_name ?? "—"}</td>
      <td colSpan={2}>
        <form action={formAction} className={styles.limitsForm}>
          <input
            type="number"
            step="0.01"
            name="weight_limit_kg"
            defaultValue={purchaser.weight_limit_kg ?? ""}
            placeholder="No limit"
            className={styles.limitsInput}
          />
          <input
            type="number"
            step="0.01"
            name="advance_amount"
            defaultValue={purchaser.advance_amount ?? ""}
            placeholder="No advance"
            className={styles.limitsInput}
          />
          <button type="submit" className={styles.iconBtn} disabled={pending} aria-label="Save">
            {pending ? <Loader2 size={15} className={styles.spin} /> : "Save"}
          </button>
        </form>
        {state.error && <div className={styles.banner}>{state.error}</div>}
      </td>
    </tr>
  );
}

export default function PurchaserLimitsManager({ purchasers }: { purchasers: PurchaserRow[] }) {
  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle} style={{ fontSize: "1.1rem" }}>
        Purchaser Buying Limits &amp; Advances
      </h2>
      {purchasers.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Purchaser</th>
                <th>Reg. no.</th>
                <th>District</th>
                <th>Weight limit (kg, this season)</th>
                <th>Government advance (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {purchasers.map((p) => (
                <PurchaserLimitRow key={p.id} purchaser={p} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Users size={28} />
          <p>No authorized purchasers registered yet.</p>
        </div>
      )}
    </div>
  );
}
