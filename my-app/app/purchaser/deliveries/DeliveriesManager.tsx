/**
 * Client Component for the Authorized Purchaser's incoming-deliveries
 * table: tracks a fulfilled rice request from "scheduled" through
 * "delivered", then lets the purchaser confirm receipt themselves once the
 * driver has marked it delivered. Mirrors the table/modal-confirm pattern
 * in ../rice-requests/RiceRequestsManager.tsx (withdraw action there,
 * confirm-received here).
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Truck, CheckCircle2 } from "lucide-react";
import { confirmRiceRequestReceipt } from "@/app/actions/purchases";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "../PurchaserDashboard.module.css";

export type DeliveryStatus = {
  id: number;
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
  driver_name: string | null;
  vehicle_registration: string | null;
  scheduled_date: string;
  received_at: string | null;
} | null;

export type RiceRequestRow = {
  id: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  status: "pending" | "approved" | "rejected" | "fulfilled" | "received";
  requested_date: string;
  delivery: DeliveryStatus;
};

const DELIVERY_STATUS_LABEL: Record<NonNullable<DeliveryStatus>["status"], string> = {
  scheduled: "Scheduled",
  in_transit: "In Transit",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

const DELIVERY_STATUS_BADGE: Record<NonNullable<DeliveryStatus>["status"], string> = {
  scheduled: styles["badge-warning"],
  in_transit: styles["badge-warning"],
  delivered: styles["badge-success"],
  delayed: styles["badge-danger"],
  cancelled: styles["badge-danger"],
};

export default function DeliveriesManager({ deliveries }: { deliveries: RiceRequestRow[] }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<RiceRequestRow | null>(null);

  function confirmReceived() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await confirmRiceRequestReceipt(target.id);
      if (result.error) setActionError(result.error);
      setConfirmTarget(null);
    });
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Deliveries</h1>
        <p className={styles.subtitle}>
          Track paddy on its way from the warehouse, and confirm once it arrives.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Incoming loads</h2>
        {actionError && <div className={clsx(styles.badge, styles["badge-danger"])}>{actionError}</div>}
        {deliveries.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Paddy type</th>
                  <th>Quantity (kg)</th>
                  <th>Driver / Vehicle</th>
                  <th>Delivery status</th>
                  <th>Request status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((r) => {
                  const d = r.delivery!;
                  const canConfirm = r.status === "fulfilled" && d.status === "delivered" && !d.received_at;
                  return (
                    <tr key={r.id}>
                      <td>{r.paddy_type_name ?? "—"}</td>
                      <td>{Number(r.quantity_kg).toLocaleString()}</td>
                      <td>
                        {d.driver_name ?? "—"} ({d.vehicle_registration ?? "—"})
                      </td>
                      <td>
                        <span className={clsx(styles.badge, DELIVERY_STATUS_BADGE[d.status])}>
                          {DELIVERY_STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td>
                        {r.status === "received" ? (
                          <span className={clsx(styles.badge, styles["badge-success"])}>
                            <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                            Received{d.received_at ? ` ${format(new Date(d.received_at), "MMM d, yyyy")}` : ""}
                          </span>
                        ) : (
                          <span className={clsx(styles.badge, styles["badge-warning"])}>{r.status}</span>
                        )}
                      </td>
                      <td>
                        {canConfirm && (
                          <button
                            type="button"
                            className={styles.confirmReceiptBtn}
                            disabled={isPending}
                            onClick={() => setConfirmTarget(r)}
                          >
                            Confirm Received
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyRow}>
            <Truck size={20} />
            <span>No deliveries yet — they&apos;ll show up here once a warehouse fulfills your request.</span>
          </div>
        )}
      </div>

      {confirmTarget && (
        <ConfirmModal
          title="Confirm this load was received?"
          message="This tells the warehouse your paddy has physically arrived. This cannot be undone."
          confirmLabel="Confirm Received"
          pendingLabel="Confirming…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmReceived}
          onClose={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
