/**
 * Client Component driving the approvals table: tab-filters harvests by
 * status, and (when `canWrite` is true) lets the user create/edit harvest
 * records and run the approve/reject/collect/delete Server Actions.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import Link from "next/link";
import {
  ArrowDownUp,
  Check,
  ClipboardList,
  PackageCheck,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  approveHarvest,
  collectHarvest,
  deleteHarvest,
  rejectHarvest,
  verifyHarvestTransaction,
} from "@/app/actions/approvals";
import HarvestFormModal, {
  type EditableHarvest,
  type FarmerOption,
  type PaddyTypeOption,
  type WarehouseOption,
} from "./HarvestFormModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "./Approvals.module.css";

/** Shape of a harvest record as returned by `GET /api/admin/harvests/`. */
export type HarvestRow = {
  id: number;
  farmer: number;
  farmer_name: string | null;
  farmer_reliability_score: number | null;
  paddy_type: number | null;
  paddy_type_name: string | null;
  warehouse: number | null;
  warehouse_name: string | null;
  quantity_kg: string;
  harvest_date: string;
  purchase_date: string | null;
  grade: "A" | "B" | "C" | null;
  moisture_level: string | null;
  quality_check: boolean | null;
  unit_price: string | null;
  status: "pending" | "verified" | "collected" | "rejected";
  // Whoever most recently ran approve/reject/collect on this harvest — null
  // until the first action, so pending harvests generally show "—".
  processed_by_name: string | null;
  // Set once, in mark_collected — see the public /trace/<lot_code> page.
  lot_code: string | null;
};

const TABS: { key: HarvestRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

// Farmer.reliability_score is 0 both for "no track record yet" and for a
// genuinely poor trailing-12-month record — HarvestRow can't tell those
// apart, so a null/0 score renders as "Unknown" rather than a red "Low".
function reliabilityBadgeClass(score: number | null) {
  if (score === null) return styles.reliabilityUnknown;
  if (score === 0) return styles.reliabilityUnknown;
  if (score >= 70) return styles.reliabilityHigh;
  if (score >= 40) return styles.reliabilityMedium;
  return styles.reliabilityLow;
}

/**
 * Renders the status-tabbed harvest table (pending/verified/collected/
 * rejected) with per-row action buttons. `harvests`, `farmers`,
 * `paddyTypes`, and `warehouses` are pre-fetched server-side by the parent
 * page. `canWrite` controls whether create/edit/approve/reject/delete
 * controls are rendered at all.
 */
export default function ApprovalsManager({
  harvests,
  farmers,
  paddyTypes,
  warehouses,
  canWrite,
}: {
  harvests: HarvestRow[];
  farmers: FarmerOption[];
  paddyTypes: PaddyTypeOption[];
  warehouses: WarehouseOption[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<HarvestRow["status"]>("pending");
  const [sortByReliability, setSortByReliability] = useState(false);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; harvest: EditableHarvest } | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // useTransition marks the Server Action calls below as non-urgent so the
  // UI (tab switching etc.) stays responsive while an action is in flight;
  // isPending drives the disabled state on action buttons.
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const rows = harvests.filter((h) => h.status === tab);
    if (!sortByReliability) return rows;
    // Higher reliability first; farmers with no score yet sort last rather
    // than being mistaken for a poor track record.
    return [...rows].sort(
      (a, b) => (b.farmer_reliability_score ?? -1) - (a.farmer_reliability_score ?? -1)
    );
  }, [harvests, tab, sortByReliability]);

  // Count of harvests per status, used for the badge next to each tab.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of harvests) map[h.status] = (map[h.status] ?? 0) + 1;
    return map;
  }, [harvests]);

  // Shared wrapper for the approve/reject/collect/delete Server Actions:
  // clears any previous error, runs the action inside a transition, and
  // surfaces a returned error message if the action failed.
  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setActionError(result.error);
    });
  }

  const [deleteTarget, setDeleteTarget] = useState<HarvestRow | null>(null);

  function handleDelete(h: HarvestRow) {
    setDeleteTarget(h);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteHarvest(target.id);
      if (result.error) setActionError(result.error);
      setDeleteTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Purchase Approvals</h1>

        {canWrite && (
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setModal({ mode: "create" })}
          >
            <Plus size={16} /> Add harvest
          </button>
        )}
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
        <button
          type="button"
          className={clsx(styles.tab, styles.sortBtn, sortByReliability && styles.tabActive)}
          onClick={() => setSortByReliability((v) => !v)}
          title="Prioritize harvests from more reliable farmers"
        >
          <ArrowDownUp size={14} />
          Sort by reliability
        </button>
      </div>

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        {filtered.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Reliability</th>
                  <th>Paddy type</th>
                  <th>Warehouse</th>
                  <th>Quantity (kg)</th>
                  <th>Grade</th>
                  <th>Unit price</th>
                  <th>Date</th>
                  <th>Processed by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td>{h.farmer_name ?? "—"}</td>
                    <td>
                      <span className={clsx(styles.reliabilityBadge, reliabilityBadgeClass(h.farmer_reliability_score))}>
                        {h.farmer_reliability_score ? `${Math.round(h.farmer_reliability_score)}/100` : "No data"}
                      </span>
                    </td>
                    <td>{h.paddy_type_name ?? "—"}</td>
                    <td>{h.warehouse_name ?? "—"}</td>
                    <td>{Number(h.quantity_kg).toLocaleString()}</td>
                    <td>{h.grade ? `Grade ${h.grade}` : "—"}</td>
                    <td>{h.unit_price ? `Rs. ${Number(h.unit_price).toLocaleString()}` : "—"}</td>
                    <td>{h.purchase_date ?? h.harvest_date}</td>
                    <td>{h.processed_by_name ?? "—"}</td>
                    <td>
                      <div className={styles.rowActions}>
                        {canWrite && (
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="Edit"
                            onClick={() =>
                              setModal({
                                mode: "edit",
                                harvest: {
                                  id: h.id,
                                  farmer: h.farmer,
                                  paddy_type: h.paddy_type,
                                  warehouse: h.warehouse,
                                  quantity_kg: h.quantity_kg,
                                  purchase_date: h.purchase_date,
                                  grade: h.grade,
                                  moisture_level: h.moisture_level,
                                  quality_check: h.quality_check,
                                  unit_price: h.unit_price,
                                },
                              })
                            }
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canWrite && h.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.approveBtn)}
                              aria-label="Approve"
                              disabled={isPending}
                              onClick={() => runAction(() => approveHarvest(h.id))}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.rejectBtn)}
                              aria-label="Reject"
                              disabled={isPending}
                              onClick={() => runAction(() => rejectHarvest(h.id))}
                            >
                              <X size={15} />
                            </button>
                          </>
                        )}
                        {canWrite && h.status === "verified" && (
                          <button
                            type="button"
                            className={clsx(styles.iconBtn, styles.approveBtn)}
                            aria-label="Mark collected"
                            disabled={isPending}
                            onClick={() => runAction(() => collectHarvest(h.id))}
                          >
                            <PackageCheck size={15} />
                          </button>
                        )}
                        {canWrite && h.status === "collected" && (
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="Verify transaction"
                            title="Record an accountability sign-off on this transaction"
                            disabled={isPending}
                            onClick={() => runAction(() => verifyHarvestTransaction(h.id))}
                          >
                            <ShieldCheck size={15} />
                          </button>
                        )}
                        {h.lot_code && (
                          <Link
                            href={`/trace/${h.lot_code}`}
                            target="_blank"
                            className={styles.iconBtn}
                            aria-label="View QR / trace"
                            title="View QR / trace"
                          >
                            <QrCode size={15} />
                          </Link>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            className={clsx(styles.iconBtn, styles.rejectBtn)}
                            aria-label="Delete"
                            disabled={isPending}
                            onClick={() => handleDelete(h)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <ClipboardList size={28} />
            <p>No {tab} harvests.</p>
          </div>
        )}
      </div>

      {modal?.mode === "create" && (
        <HarvestFormModal
          mode="create"
          farmers={farmers}
          paddyTypes={paddyTypes}
          warehouses={warehouses}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <HarvestFormModal
          mode="edit"
          harvest={modal.harvest}
          farmers={farmers}
          paddyTypes={paddyTypes}
          warehouses={warehouses}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this harvest record?"
          message="This cannot be undone."
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          variant="danger"
          pending={isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
