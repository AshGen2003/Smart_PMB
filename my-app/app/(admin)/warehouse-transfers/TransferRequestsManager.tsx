/**
 * Client Component driving the officer-facing warehouse transfer review
 * queue: tab-filters requests by status, and (when `canWrite` is true)
 * lets the user approve a pending request (moves the stock atomically) or
 * reject it with an optional note. Mirrors the tab/table/action pattern in
 * (admin)/purchase-requests/PurchaseRequestsManager.tsx — simpler than
 * that flow since there's no separate "fulfill" step here (both
 * warehouses are already fixed at request time).
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { approveWarehouseTransfer, rejectWarehouseTransfer } from "@/app/actions/warehouseTransfers";
import styles from "./WarehouseTransfers.module.css";

export type TransferRequestRow = {
  id: number;
  from_warehouse_name: string | null;
  to_warehouse_name: string | null;
  paddy_type_name: string | null;
  grade: string | null;
  quantity_kg: string;
  requested_by_name: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by_name: string | null;
  review_notes: string;
  requested_date: string;
};

const TABS: { key: TransferRequestRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<TransferRequestRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function TransferRequestsManager({
  requests,
  canWrite,
}: {
  requests: TransferRequestRow[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<TransferRequestRow["status"]>("pending");
  const [rejectTarget, setRejectTarget] = useState<TransferRequestRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
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

  function handleApprove(r: TransferRequestRow) {
    runAction(() => approveWarehouseTransfer(r.id));
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    runAction(async () => {
      const result = await rejectWarehouseTransfer(target.id, rejectNotes);
      setRejectNotes("");
      return result;
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Warehouse Transfers</h1>
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
                  <th>From</th>
                  <th>To</th>
                  <th>Paddy type</th>
                  <th>Quantity (kg)</th>
                  <th>Requested by</th>
                  <th>Requested</th>
                  <th>Status</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.from_warehouse_name ?? "—"}</td>
                    <td>{r.to_warehouse_name ?? "—"}</td>
                    <td>
                      {r.paddy_type_name ?? "—"}
                      {r.grade && ` (Grade ${r.grade})`}
                    </td>
                    <td>{Number(r.quantity_kg).toLocaleString()}</td>
                    <td>{r.requested_by_name ?? "—"}</td>
                    <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, STATUS_BADGE[r.status])}>{r.status}</span>
                    </td>
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
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <ArrowRightLeft size={28} />
            <p>No {tab} transfer requests.</p>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject transfer request</h3>
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
    </div>
  );
}
