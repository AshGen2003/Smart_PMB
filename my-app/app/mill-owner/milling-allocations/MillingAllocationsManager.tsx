/**
 * Client Component driving the mill owner's raw-paddy allocation requests
 * and the milled-rice return requests that follow a fulfilled one: a
 * request form, a table of allocation history (withdraw while pending,
 * request a return once fulfilled), and a table of return-request history.
 * Mirrors the table/action pattern in mill-owner/licenses/LicensesManager.tsx.
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Boxes, Truck } from "lucide-react";
import { withdrawMillingAllocation, withdrawMillingReturn } from "@/app/actions/mills";
import ConfirmModal from "@/app/components/ConfirmModal";
import MillingAllocationForm, { type PaddyTypeOption } from "./MillingAllocationForm";
import RequestReturnForm, { type WarehouseOption } from "./RequestReturnForm";
import styles from "./MillingAllocations.module.css";

export type DeliveryStatus = {
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
  driver_name: string | null;
  vehicle_registration: string | null;
  scheduled_date: string;
} | null;

// One row = one allocation request. Lifecycle: pending -> approved (officer
// signs off) -> fulfilled (officer releases the paddy from a warehouse) --
// or pending -> rejected. See mills/models.py's MillingAllocation.Status.
export type AllocationRow = {
  id: number;
  paddy_type: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requested_date: string;
  review_notes: string;
  delivery: DeliveryStatus;
};

export type ReturnRow = {
  id: number;
  allocation: number;
  destination_warehouse: number;
  destination_warehouse_name: string | null;
  rice_kg: string;
  status: "pending" | "approved" | "rejected" | "dispatched" | "delivered";
  requested_date: string;
  review_notes: string;
  delivery: DeliveryStatus;
};

const ALLOCATION_BADGE: Record<AllocationRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-success"],
  fulfilled: styles["badge-success"],
  rejected: styles["badge-danger"],
};

const RETURN_BADGE: Record<ReturnRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-success"],
  dispatched: styles["badge-success"],
  delivered: styles["badge-success"],
  rejected: styles["badge-danger"],
};

const DELIVERY_STATUS_LABEL: Record<NonNullable<DeliveryStatus>["status"], string> = {
  scheduled: "Scheduled",
  in_transit: "In Transit",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

/** Compact "driver — status" cell, or a placeholder when no officer has scheduled a delivery yet. Mirrors purchaser/rice-requests/RiceRequestsManager.tsx's DeliveryCell. */
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

export default function MillingAllocationsManager({
  allocations,
  returns,
  paddyTypes,
  warehouses,
}: {
  allocations: AllocationRow[];
  returns: ReturnRow[];
  paddyTypes: PaddyTypeOption[];
  warehouses: WarehouseOption[];
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [returnFormFor, setReturnFormFor] = useState<number | null>(null);
  const [withdrawAllocationTarget, setWithdrawAllocationTarget] = useState<AllocationRow | null>(null);
  const [withdrawReturnTarget, setWithdrawReturnTarget] = useState<ReturnRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Allocations that already have a non-rejected return request shouldn't
  // offer "Request return" again — one return per allocation is the norm.
  // (This is a frontend-only convenience check for hiding the button — the
  // backend independently enforces the real rule too.)
  const allocationIdsWithReturn = new Set(
    returns.filter((r) => r.status !== "rejected").map((r) => r.allocation)
  );

  function confirmWithdrawAllocation() {
    if (!withdrawAllocationTarget) return;
    const target = withdrawAllocationTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawMillingAllocation(target.id);
      if (result.error) setActionError(result.error);
      setWithdrawAllocationTarget(null);
    });
  }

  function confirmWithdrawReturn() {
    if (!withdrawReturnTarget) return;
    const target = withdrawReturnTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawMillingReturn(target.id);
      if (result.error) setActionError(result.error);
      setWithdrawReturnTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.pageTitle}>Milling Allocations</h1>
        <span className={styles.subtitle}>
          Request raw paddy from a PMB warehouse for milling, then send the milled rice back once it&apos;s ready.
        </span>
      </div>

      <MillingAllocationForm paddyTypes={paddyTypes} />

      {actionError && <div className={styles.banner}>{actionError}</div>}

      {/* Table 1 of 2: this mill's own allocation request history. */}
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>My allocation requests</h2>
        {allocations.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Paddy type</th>
                  <th>Quantity (kg)</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <React.Fragment key={a.id}>
                    <tr>
                      <td>{a.paddy_type_name ?? "—"}</td>
                      <td>{Number(a.quantity_kg).toLocaleString()}</td>
                      <td>{format(new Date(a.requested_date), "MMM d, yyyy")}</td>
                      <td>
                        <span className={clsx(styles.badge, ALLOCATION_BADGE[a.status])}>{a.status}</span>
                      </td>
                      <td>{a.status === "fulfilled" ? <DeliveryCell delivery={a.delivery} /> : "—"}</td>
                      <td>{a.review_notes || "—"}</td>
                      <td>
                        <div className={styles.rowActions}>
                          {a.status === "pending" && (
                            <button
                              type="button"
                              className={styles.withdrawBtn}
                              disabled={isPending}
                              onClick={() => setWithdrawAllocationTarget(a)}
                            >
                              Withdraw
                            </button>
                          )}
                          {a.status === "fulfilled" && !allocationIdsWithReturn.has(a.id) && (
                            <button
                              type="button"
                              className={styles.returnBtn}
                              onClick={() => setReturnFormFor(returnFormFor === a.id ? null : a.id)}
                            >
                              {returnFormFor === a.id ? "Cancel" : "Request return"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {returnFormFor === a.id && (
                      <tr className={styles.returnFormRow}>
                        <td colSpan={7}>
                          <RequestReturnForm
                            allocationId={a.id}
                            warehouses={warehouses}
                            onDone={() => setReturnFormFor(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Boxes size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>No allocation requests yet. Use the form above to submit one.</div>
          </div>
        )}
      </div>

      {/* Table 2 of 2: return requests (sending the milled rice back to a warehouse
          once an allocation above is fulfilled) — opened via the "Request return"
          button in the table above, handled by RequestReturnForm.tsx. */}
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>My return requests</h2>
        {returns.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Destination warehouse</th>
                  <th>Rice (kg)</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Delivery</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td>{r.destination_warehouse_name ?? "—"}</td>
                    <td>{Number(r.rice_kg).toLocaleString()}</td>
                    <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, RETURN_BADGE[r.status])}>{r.status}</span>
                    </td>
                    <td>{r.status === "approved" || r.status === "dispatched" || r.status === "delivered" ? <DeliveryCell delivery={r.delivery} /> : "—"}</td>
                    <td>{r.review_notes || "—"}</td>
                    <td>
                      {r.status === "pending" && (
                        <button
                          type="button"
                          className={styles.withdrawBtn}
                          disabled={isPending}
                          onClick={() => setWithdrawReturnTarget(r)}
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Truck size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>No return requests yet.</div>
          </div>
        )}
      </div>

      {withdrawAllocationTarget && (
        <ConfirmModal
          title="Withdraw this allocation request?"
          message="This cannot be undone."
          confirmLabel="Withdraw"
          pendingLabel="Withdrawing…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmWithdrawAllocation}
          onClose={() => setWithdrawAllocationTarget(null)}
        />
      )}

      {withdrawReturnTarget && (
        <ConfirmModal
          title="Withdraw this return request?"
          message="This cannot be undone."
          confirmLabel="Withdraw"
          pendingLabel="Withdrawing…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmWithdrawReturn}
          onClose={() => setWithdrawReturnTarget(null)}
        />
      )}
    </div>
  );
}
