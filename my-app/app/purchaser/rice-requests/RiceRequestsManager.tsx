/**
 * Client Component driving the Authorized Purchaser's own rice requests: a
 * request-rice form plus a table of their full history, with a withdraw
 * action on pending rows. Mirrors the table/action pattern in
 * mill-owner/licenses/LicensesManager.tsx (the mill-owner equivalent).
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Package } from "lucide-react";
import { withdrawRiceRequest } from "@/app/actions/purchases";
import ConfirmModal from "@/app/components/ConfirmModal";
import RequestRiceForm, { type PaddyTypeOption } from "./RequestRiceForm";
import styles from "../PurchaserDashboard.module.css";

export type DeliveryStatus = {
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
  driver_name: string | null;
  vehicle_registration: string | null;
  scheduled_date: string;
} | null;

export type RiceRequestRow = {
  id: number;
  paddy_type: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requested_date: string;
  delivery: DeliveryStatus;
};

const STATUS_BADGE: Record<RiceRequestRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-success"],
  fulfilled: styles["badge-success"],
  rejected: styles["badge-danger"],
};

const DELIVERY_STATUS_LABEL: Record<NonNullable<DeliveryStatus>["status"], string> = {
  scheduled: "Scheduled",
  in_transit: "In Transit",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

/** Compact "driver — status" cell, or a placeholder when no officer has scheduled a delivery yet. */
function DeliveryCell({ delivery }: { delivery: DeliveryStatus }) {
  if (!delivery) return <span className={styles.subtitle}>Not yet scheduled</span>;
  return (
    <div>
      <div>{delivery.driver_name ?? "—"} ({delivery.vehicle_registration ?? "—"})</div>
      <span className={clsx(styles.badge, delivery.status === "delivered" ? styles["badge-success"] : styles["badge-warning"])}>
        {DELIVERY_STATUS_LABEL[delivery.status]}
      </span>
    </div>
  );
}

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
        <h1 className={styles.title}>Paddy Requests</h1>
        <p className={styles.subtitle}>Request paddy from warehouse stock and track its fulfillment.</p>
      </div>

      <RequestRiceForm paddyTypes={paddyTypes} />

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>My requests</h2>
        {actionError && <div className={clsx(styles.badge, styles["badge-danger"])}>{actionError}</div>}
        {requests.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paddy type</th>
                <th>Quantity (kg)</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Delivery</th>
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
                  <td>{r.status === "fulfilled" ? <DeliveryCell delivery={r.delivery} /> : "—"}</td>
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
            <span>No paddy requests yet. Use the form above to submit one.</span>
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
