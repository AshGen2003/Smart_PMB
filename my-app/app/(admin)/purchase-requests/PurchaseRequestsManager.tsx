/**
 * Client Component driving the officer-facing rice request review queue:
 * tab-filters requests by status, and (when `canWrite` is true) lets the
 * user approve pending requests, reject them with an optional note, or
 * fulfill an approved request from a chosen warehouse. Mirrors the
 * tab/table/action pattern in (admin)/licenses/LicensesManager.tsx.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Check, ClipboardList, Package, ShieldCheck, X } from "lucide-react";
import {
  approveRiceRequest,
  fulfillRiceRequest,
  rejectRiceRequest,
  verifyRiceRequestTransaction,
} from "@/app/actions/purchases";
import styles from "./PurchaseRequests.module.css";

export type RiceRequestRow = {
  id: number;
  purchaser: number;
  purchaser_name: string | null;
  paddy_type: number;
  paddy_type_name: string | null;
  quantity_kg: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requested_date: string;
  reviewed_by_name: string | null;
  fulfilled_from_warehouse: number | null;
  review_notes: string;
};

export type WarehouseOption = { id: number; name: string };

const TABS: { key: RiceRequestRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<RiceRequestRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-neutral"],
  fulfilled: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function PurchaseRequestsManager({
  requests,
  warehouses,
  canWrite,
}: {
  requests: RiceRequestRow[];
  warehouses: WarehouseOption[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<RiceRequestRow["status"]>("pending");
  const [rejectTarget, setRejectTarget] = useState<RiceRequestRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [fulfillTarget, setFulfillTarget] = useState<RiceRequestRow | null>(null);
  const [fulfillWarehouse, setFulfillWarehouse] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => requests.filter((r) => r.status === tab), [requests, tab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) map[r.status] = (map[r.status] ?? 0) + 1;
    return map;
  }, [requests]);

  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setActionError(result.error);
    });
  }

  function handleApprove(r: RiceRequestRow) {
    runAction(() => approveRiceRequest(r.id));
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    runAction(async () => {
      const result = await rejectRiceRequest(target.id, rejectNotes);
      setRejectNotes("");
      return result;
    });
  }

  function handleFulfillConfirm() {
    if (!fulfillTarget || !fulfillWarehouse) return;
    const target = fulfillTarget;
    const warehouseId = Number(fulfillWarehouse);
    setFulfillTarget(null);
    runAction(async () => {
      const result = await fulfillRiceRequest(target.id, warehouseId);
      setFulfillWarehouse("");
      return result;
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Paddy Requests</h1>
      </div>

      <div className={styles.tabsRow}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={clsx(styles.tab, tab === t.key && styles.tabActive)}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className={styles.tabCount}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        {filtered.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Purchaser</th>
                  <th>Paddy type</th>
                  <th>Quantity (kg)</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.purchaser_name ?? "—"}</td>
                    <td>{r.paddy_type_name ?? "—"}</td>
                    <td>{Number(r.quantity_kg).toLocaleString()}</td>
                    <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, STATUS_BADGE[r.status])}>{r.status}</span>
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
                              onClick={() => handleApprove(r)}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.rejectBtn)}
                              aria-label="Reject"
                              disabled={isPending}
                              onClick={() => setRejectTarget(r)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )}
                        {r.status === "approved" && (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.fulfillBtn)}
                              aria-label="Fulfill"
                              disabled={isPending}
                              onClick={() => setFulfillTarget(r)}
                            >
                              <Package size={15} />
                            </button>
                          </div>
                        )}
                        {r.status === "fulfilled" && (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Verify transaction"
                              title="Record an accountability sign-off on this transaction"
                              disabled={isPending}
                              onClick={() => runAction(() => verifyRiceRequestTransaction(r.id))}
                            >
                              <ShieldCheck size={15} />
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
            <ClipboardList size={28} />
            <p>No {tab} paddy requests.</p>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject paddy request</h3>
            <textarea
              className={styles.textarea}
              placeholder="Reason (optional)"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleRejectConfirm}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {fulfillTarget && (
        <div className={styles.overlay} onClick={() => setFulfillTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Fulfill paddy request</h3>
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
    </div>
  );
}
