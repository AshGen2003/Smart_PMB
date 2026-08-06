/**
 * Client Component driving the Authorized Purchaser's own rice requests: a
 * request-rice form plus a table of their full history, with a withdraw
 * action on pending rows. Mirrors the table/action pattern in
 * partner/licenses/LicensesManager.tsx (the mill-owner equivalent).
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Package } from "lucide-react";
import { withdrawRiceRequest } from "@/app/actions/purchases";
import ConfirmModal from "@/app/components/ConfirmModal";
import RequestRiceForm, { type PaddyTypeOption } from "./RequestRiceForm";
import styles from "../PartnerDashboard.module.css";

export type RiceRequestRow = {
  id: number;
  paddy_type: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requested_date: string;
};

const STATUS_BADGE: Record<RiceRequestRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-success"],
  fulfilled: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function RiceRequestsManager({
  requests,
  paddyTypes,
}: {
  requests: RiceRequestRow[];
  paddyTypes: PaddyTypeOption[];
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [withdrawTarget, setWithdrawTarget] = useState<RiceRequestRow | null>(null);

  function handleWithdraw(r: RiceRequestRow) {
    setWithdrawTarget(r);
  }

  function confirmWithdraw() {
    if (!withdrawTarget) return;
    const target = withdrawTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawRiceRequest(target.id);
      if (result.error) setActionError(result.error);
      setWithdrawTarget(null);
    });
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rice Requests</h1>
        <p className={styles.subtitle}>Request rice from warehouse stock and track its fulfillment.</p>
      </div>

      <RequestRiceForm paddyTypes={paddyTypes} />

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>My requests</h2>
        {actionError && <div className={clsx(styles.badge, styles["badge-danger"])}>{actionError}</div>}
        {requests.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rice type</th>
                <th>Quantity (kg)</th>
                <th>Requested</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.paddy_type_name ?? "—"}</td>
                  <td>{Number(r.quantity_kg).toLocaleString()}</td>
                  <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                  <td>
                    <span className={clsx(styles.badge, STATUS_BADGE[r.status])}>{r.status}</span>
                  </td>
                  <td>
                    {r.status === "pending" && (
                      <button
                        type="button"
                        className={styles.withdrawBtn}
                        disabled={isPending}
                        onClick={() => handleWithdraw(r)}
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
          <div className={styles.emptyRow}>
            <Package size={20} />
            <span>No rice requests yet. Use the form above to submit one.</span>
          </div>
        )}
      </div>

      {withdrawTarget && (
        <ConfirmModal
          title="Withdraw this request?"
          message="This cannot be undone."
          confirmLabel="Withdraw"
          pendingLabel="Withdrawing…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmWithdraw}
          onClose={() => setWithdrawTarget(null)}
        />
      )}
    </div>
  );
}
