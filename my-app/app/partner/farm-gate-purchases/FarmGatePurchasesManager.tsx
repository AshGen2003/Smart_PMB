/**
 * Client Component driving the Authorized Purchaser's farm-gate buying
 * terminal: a record-purchase form, a table of purchase history (with a
 * checkbox selection on still-unassigned rows for bundling into a new
 * DispatchManifest), and a table of manifest history with withdraw while
 * pending. Mirrors the two-section table/action pattern in mill-owner/
 * milling-allocations/MillingAllocationsManager.tsx.
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Receipt, Truck } from "lucide-react";
import { withdrawDispatchManifest } from "@/app/actions/purchases";
import FarmGatePurchaseForm, { type PaddyTypeOption } from "./FarmGatePurchaseForm";
import DispatchManifestForm, { type WarehouseOption } from "./DispatchManifestForm";
import styles from "./FarmGatePurchases.module.css";

export type FarmGatePurchaseRow = {
  id: number;
  farmer: number;
  farmer_name: string | null;
  paddy_type: number;
  paddy_type_name: string | null;
  weight_kg: string;
  unit_price: string;
  total_amount: string;
  receipt_no: string;
  purchase_date: string;
  manifest: number | null;
};

export type DispatchManifestRow = {
  id: number;
  destination_warehouse: number;
  destination_warehouse_name: string | null;
  status: "pending" | "approved" | "rejected" | "dispatched" | "delivered";
  requested_date: string;
  review_notes: string;
  purchases: FarmGatePurchaseRow[];
};

const MANIFEST_BADGE: Record<DispatchManifestRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-success"],
  dispatched: styles["badge-success"],
  delivered: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function FarmGatePurchasesManager({
  purchases,
  manifests,
  paddyTypes,
  warehouses,
}: {
  purchases: FarmGatePurchaseRow[];
  manifests: DispatchManifestRow[];
  paddyTypes: PaddyTypeOption[];
  warehouses: WarehouseOption[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showManifestForm, setShowManifestForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleManifestDone() {
    setSelected(new Set());
    setShowManifestForm(false);
  }

  function handleWithdraw(m: DispatchManifestRow) {
    if (!window.confirm("Withdraw this dispatch manifest? This cannot be undone.")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawDispatchManifest(m.id);
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Farm-Gate Purchases</h1>
        <span className={styles.subtitle}>
          Buy paddy directly from farmers at their guaranteed price, then bundle your purchases into a manifest to
          send to a PMB warehouse.
        </span>
      </div>

      <FarmGatePurchaseForm paddyTypes={paddyTypes} />

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>My purchases</h2>
          {selected.size > 0 && (
            <button
              type="button"
              className={styles.manifestBtn}
              onClick={() => setShowManifestForm((v) => !v)}
            >
              {showManifestForm ? "Cancel" : `Bundle ${selected.size} into manifest`}
            </button>
          )}
        </div>

        {showManifestForm && selected.size > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <DispatchManifestForm
              purchaseIds={Array.from(selected)}
              warehouses={warehouses}
              onDone={handleManifestDone}
            />
          </div>
        )}

        {purchases.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th></th>
                <th>Receipt</th>
                <th>Farmer</th>
                <th>Paddy type</th>
                <th>Weight (kg)</th>
                <th>Total (Rs.)</th>
                <th>Date</th>
                <th>Manifest</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.manifest === null && (
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        aria-label={`Select purchase ${p.receipt_no}`}
                      />
                    )}
                  </td>
                  <td>{p.receipt_no}</td>
                  <td>{p.farmer_name ?? "—"}</td>
                  <td>{p.paddy_type_name ?? "—"}</td>
                  <td>{Number(p.weight_kg).toLocaleString()}</td>
                  <td>{Number(p.total_amount).toLocaleString()}</td>
                  <td>{format(new Date(p.purchase_date), "MMM d, yyyy")}</td>
                  <td>
                    <span className={clsx(styles.badge, p.manifest === null ? styles["badge-neutral"] : styles["badge-success"])}>
                      {p.manifest === null ? "unassigned" : "assigned"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <Receipt size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>No farm-gate purchases yet. Use the form above to record one.</div>
          </div>
        )}
      </div>

      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Dispatch manifests</h2>
        {manifests.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Destination warehouse</th>
                <th>Purchases</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {manifests.map((m) => (
                <tr key={m.id}>
                  <td>{m.destination_warehouse_name ?? "—"}</td>
                  <td>
                    <ul className={styles.manifestPurchaseList}>
                      {m.purchases.map((p) => (
                        <li key={p.id}>{p.receipt_no} ({Number(p.weight_kg).toLocaleString()} kg)</li>
                      ))}
                    </ul>
                  </td>
                  <td>{format(new Date(m.requested_date), "MMM d, yyyy")}</td>
                  <td>
                    <span className={clsx(styles.badge, MANIFEST_BADGE[m.status])}>{m.status}</span>
                  </td>
                  <td>{m.review_notes || "—"}</td>
                  <td>
                    {m.status === "pending" && (
                      <button
                        type="button"
                        className={styles.withdrawBtn}
                        disabled={isPending}
                        onClick={() => handleWithdraw(m)}
                      >
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <Truck size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>No dispatch manifests yet. Select unassigned purchases above to create one.</div>
          </div>
        )}
      </div>
    </div>
  );
}
