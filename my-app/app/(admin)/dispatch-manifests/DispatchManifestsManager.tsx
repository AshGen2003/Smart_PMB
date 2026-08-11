/**
 * Client Component driving the officer-facing dispatch-manifest review
 * queue: tab-filters manifests by status, and (when `canWrite` is true)
 * lets the user approve a pending manifest or reject it with an optional
 * note. Approval doesn't create the Delivery itself — an officer links one
 * separately via Transportation. Mirrors the tab/table/action pattern in
 * (admin)/purchase-requests/PurchaseRequestsManager.tsx.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Check, Truck, X } from "lucide-react";
import { approveDispatchManifest, rejectDispatchManifest } from "@/app/actions/purchases";
import styles from "./DispatchManifests.module.css";

export type DispatchManifestPurchaseRow = {
  id: number;
  receipt_no: string;
  weight_kg: string;
};

export type DispatchManifestRow = {
  id: number;
  purchaser: number;
  purchaser_name: string | null;
  destination_warehouse: number;
  destination_warehouse_name: string | null;
  status: "pending" | "approved" | "rejected" | "dispatched" | "delivered";
  requested_date: string;
  reviewed_by_name: string | null;
  review_notes: string;
  purchases: DispatchManifestPurchaseRow[];
};

const TABS: { key: DispatchManifestRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<DispatchManifestRow["status"], string> = {
  pending: styles["badge-warning"],
  approved: styles["badge-neutral"],
  dispatched: styles["badge-neutral"],
  delivered: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function DispatchManifestsManager({
  manifests,
  canWrite,
}: {
  manifests: DispatchManifestRow[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<DispatchManifestRow["status"]>("pending");
  const [rejectTarget, setRejectTarget] = useState<DispatchManifestRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => manifests.filter((m) => m.status === tab), [manifests, tab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of manifests) map[m.status] = (map[m.status] ?? 0) + 1;
    return map;
  }, [manifests]);

  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setActionError(result.error);
    });
  }

  function handleApprove(m: DispatchManifestRow) {
    runAction(() => approveDispatchManifest(m.id));
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    runAction(async () => {
      const result = await rejectDispatchManifest(target.id, rejectNotes);
      setRejectNotes("");
      return result;
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dispatch Manifests</h1>
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
                  <th>Destination warehouse</th>
                  <th>Purchases</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>{m.purchaser_name ?? "—"}</td>
                    <td>{m.destination_warehouse_name ?? "—"}</td>
                    <td>
                      <ul className={styles.purchaseList}>
                        {m.purchases.map((p) => (
                          <li key={p.id}>{p.receipt_no} ({Number(p.weight_kg).toLocaleString()} kg)</li>
                        ))}
                      </ul>
                    </td>
                    <td>{format(new Date(m.requested_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, STATUS_BADGE[m.status])}>{m.status}</span>
                    </td>
                    <td>{m.reviewed_by_name ?? "—"}</td>
                    {canWrite && (
                      <td>
                        {m.status === "pending" && (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.approveBtn)}
                              aria-label="Approve"
                              disabled={isPending}
                              onClick={() => handleApprove(m)}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.rejectBtn)}
                              aria-label="Reject"
                              disabled={isPending}
                              onClick={() => setRejectTarget(m)}
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
            <p>No {tab} dispatch manifests.</p>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject dispatch manifest</h3>
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
