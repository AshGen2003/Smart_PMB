/**
 * Client Component driving the officer-facing milling review queue: two
 * stacked, independently status-tabbed sections — raw-paddy allocation
 * requests (approve/reject/fulfill) and the milled-rice return requests
 * that follow a fulfilled one (approve/reject only; approval doesn't
 * create the Delivery itself, an officer links one separately via
 * Transportation). Mirrors the tab/table/action pattern in
 * (admin)/purchase-requests/PurchaseRequestsManager.tsx, doubled up the
 * same way mill-owner/milling-allocations/MillingAllocationsManager.tsx
 * stacks two sections on the self-service side.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Boxes, Check, Package, Truck, X } from "lucide-react";
import {
  approveMillingAllocation,
  approveMillingReturn,
  fulfillMillingAllocation,
  rejectMillingAllocation,
  rejectMillingReturn,
} from "@/app/actions/mills";
import styles from "./MillingReview.module.css";

export type MillingAllocationRow = {
  id: number;
  mill: number;
  mill_name: string | null;
  paddy_type: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requested_date: string;
  reviewed_by_name: string | null;
  fulfilled_from_warehouse: number | null;
  fulfilled_from_warehouse_name: string | null;
  review_notes: string;
};

export type MillingReturnRow = {
  id: number;
  mill: number;
  mill_name: string | null;
  allocation: number;
  destination_warehouse: number;
  destination_warehouse_name: string | null;
  rice_kg: string;
  status: "pending" | "approved" | "rejected" | "dispatched" | "delivered";
  requested_date: string;
  reviewed_by_name: string | null;
  review_notes: string;
};

export type WarehouseOption = { id: number; name: string };

const ALLOCATION_TABS: { key: MillingAllocationRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "rejected", label: "Rejected" },
];

const RETURN_TABS: { key: MillingReturnRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" },
];

const ALLOCATION_BADGE: Record<MillingAllocationRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-neutral"],
  fulfilled: styles["badge-success"],
  rejected: styles["badge-danger"],
};

const RETURN_BADGE: Record<MillingReturnRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-neutral"],
  dispatched: styles["badge-neutral"],
  delivered: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function MillingReviewManager({
  allocations,
  returns,
  warehouses,
  canWrite,
}: {
  allocations: MillingAllocationRow[];
  returns: MillingReturnRow[];
  warehouses: WarehouseOption[];
  canWrite: boolean;
}) {
  const [allocationTab, setAllocationTab] = useState<MillingAllocationRow["status"]>("pending");
  const [returnTab, setReturnTab] = useState<MillingReturnRow["status"]>("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [rejectAllocationTarget, setRejectAllocationTarget] = useState<MillingAllocationRow | null>(null);
  const [rejectAllocationNotes, setRejectAllocationNotes] = useState("");
  const [fulfillTarget, setFulfillTarget] = useState<MillingAllocationRow | null>(null);
  const [fulfillWarehouse, setFulfillWarehouse] = useState("");

  const [rejectReturnTarget, setRejectReturnTarget] = useState<MillingReturnRow | null>(null);
  const [rejectReturnNotes, setRejectReturnNotes] = useState("");

  const filteredAllocations = useMemo(
    () => allocations.filter((a) => a.status === allocationTab),
    [allocations, allocationTab]
  );
  const allocationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allocations) map[a.status] = (map[a.status] ?? 0) + 1;
    return map;
  }, [allocations]);

  const filteredReturns = useMemo(() => returns.filter((r) => r.status === returnTab), [returns, returnTab]);
  const returnCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of returns) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [returns]);

  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setActionError(result.error);
    });
  }

  function handleRejectAllocationConfirm() {
    if (!rejectAllocationTarget) return;
    const target = rejectAllocationTarget;
    setRejectAllocationTarget(null);
    runAction(async () => {
      const result = await rejectMillingAllocation(target.id, rejectAllocationNotes);
      setRejectAllocationNotes("");
      return result;
    });
  }

  function handleFulfillConfirm() {
    if (!fulfillTarget || !fulfillWarehouse) return;
    const target = fulfillTarget;
    const warehouseId = Number(fulfillWarehouse);
    setFulfillTarget(null);
    runAction(async () => {
      const result = await fulfillMillingAllocation(target.id, warehouseId);
      setFulfillWarehouse("");
      return result;
    });
  }

  function handleRejectReturnConfirm() {
    if (!rejectReturnTarget) return;
    const target = rejectReturnTarget;
    setRejectReturnTarget(null);
    runAction(async () => {
      const result = await rejectMillingReturn(target.id, rejectReturnNotes);
      setRejectReturnNotes("");
      return result;
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Milling Allocations</h1>
      </div>

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div>
        <h2 className={styles.sectionTitle}>Allocation requests</h2>
        <div className={styles.tabsRow}>
          {ALLOCATION_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={clsx(styles.tab, allocationTab === t.key && styles.tabActive)}
              onClick={() => setAllocationTab(t.key)}
            >
              {t.label}
              <span className={styles.tabCount}>{allocationCounts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className={styles.container}>
          {filteredAllocations.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mill</th>
                    <th>Paddy type</th>
                    <th>Quantity (kg)</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Reviewed by</th>
                    {canWrite && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAllocations.map((a) => (
                    <tr key={a.id}>
                      <td>{a.mill_name ?? "—"}</td>
                      <td>{a.paddy_type_name ?? "—"}</td>
                      <td>{Number(a.quantity_kg).toLocaleString()}</td>
                      <td>{format(new Date(a.requested_date), "MMM d, yyyy")}</td>
                      <td>
                        <span className={clsx(styles.badge, ALLOCATION_BADGE[a.status])}>{a.status}</span>
                      </td>
                      <td>{a.reviewed_by_name ?? "—"}</td>
                      {canWrite && (
                        <td>
                          {a.status === "pending" && (
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.approveBtn)}
                                aria-label="Approve"
                                disabled={isPending}
                                onClick={() => runAction(() => approveMillingAllocation(a.id))}
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.rejectBtn)}
                                aria-label="Reject"
                                disabled={isPending}
                                onClick={() => setRejectAllocationTarget(a)}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          )}
                          {a.status === "approved" && (
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.fulfillBtn)}
                                aria-label="Fulfill"
                                disabled={isPending}
                                onClick={() => setFulfillTarget(a)}
                              >
                                <Package size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Boxes size={28} />
              <p>No {allocationTab} allocation requests.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>Return requests</h2>
        <div className={styles.tabsRow}>
          {RETURN_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={clsx(styles.tab, returnTab === t.key && styles.tabActive)}
              onClick={() => setReturnTab(t.key)}
            >
              {t.label}
              <span className={styles.tabCount}>{returnCounts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className={styles.container}>
          {filteredReturns.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mill</th>
                    <th>Destination warehouse</th>
                    <th>Rice (kg)</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Reviewed by</th>
                    {canWrite && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((r) => (
                    <tr key={r.id}>
                      <td>{r.mill_name ?? "—"}</td>
                      <td>{r.destination_warehouse_name ?? "—"}</td>
                      <td>{Number(r.rice_kg).toLocaleString()}</td>
                      <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                      <td>
                        <span className={clsx(styles.badge, RETURN_BADGE[r.status])}>{r.status}</span>
                      </td>
                      <td>{r.reviewed_by_name ?? "—"}</td>
                      {canWrite && (
                        <td>
                          {r.status === "pending" && (
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.approveBtn)}
                                aria-label="Approve"
                                disabled={isPending}
                                onClick={() => runAction(() => approveMillingReturn(r.id))}
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.rejectBtn)}
                                aria-label="Reject"
                                disabled={isPending}
                                onClick={() => setRejectReturnTarget(r)}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Truck size={28} />
              <p>No {returnTab} return requests.</p>
            </div>
          )}
        </div>
      </div>

      {rejectAllocationTarget && (
        <div className={styles.overlay} onClick={() => setRejectAllocationTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject allocation request</h3>
            <textarea
              className={styles.textarea}
              placeholder="Reason (optional)"
              value={rejectAllocationNotes}
              onChange={(e) => setRejectAllocationNotes(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setRejectAllocationTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleRejectAllocationConfirm}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {fulfillTarget && (
        <div className={styles.overlay} onClick={() => setFulfillTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Fulfill allocation request</h3>
            <select
              className={styles.select}
              value={fulfillWarehouse}
              onChange={(e) => setFulfillWarehouse(e.target.value)}
            >
              <option value="" disabled>Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setFulfillTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!fulfillWarehouse}
                onClick={handleFulfillConfirm}
              >
                Fulfill
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectReturnTarget && (
        <div className={styles.overlay} onClick={() => setRejectReturnTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject return request</h3>
            <textarea
              className={styles.textarea}
              placeholder="Reason (optional)"
              value={rejectReturnNotes}
              onChange={(e) => setRejectReturnNotes(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setRejectReturnTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleRejectReturnConfirm}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
