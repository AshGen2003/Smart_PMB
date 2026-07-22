/**
 * Client Component driving the approvals table: tab-filters harvests by
 * status, and (when `canWrite` is true) lets the user create/edit harvest
 * records and run the approve/reject/collect/delete Server Actions.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import {
  Check,
  ClipboardList,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  approveHarvest,
  collectHarvest,
  deleteHarvest,
  rejectHarvest,
} from "@/app/actions/approvals";
import HarvestFormModal, {
  type EditableHarvest,
  type FarmerOption,
  type PaddyTypeOption,
  type WarehouseOption,
} from "./HarvestFormModal";
import styles from "./Approvals.module.css";

/** Shape of a harvest record as returned by `GET /api/admin/harvests/`. */
export type HarvestRow = {
  id: number;
  farmer: number;
  farmer_name: string | null;
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
};

const TABS: { key: HarvestRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "collected", label: "Collected" },
  { key: "rejected", label: "Rejected" },
];

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
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; harvest: EditableHarvest } | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // useTransition marks the Server Action calls below as non-urgent so the
  // UI (tab switching etc.) stays responsive while an action is in flight;
  // isPending drives the disabled state on action buttons.
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => harvests.filter((h) => h.status === tab),
    [harvests, tab]
  );

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

  function handleDelete(h: HarvestRow) {
    if (!window.confirm("Delete this harvest record? This cannot be undone.")) return;
    runAction(() => deleteHarvest(h.id));
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
      </div>

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        {filtered.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Paddy type</th>
                  <th>Warehouse</th>
                  <th>Quantity (kg)</th>
                  <th>Grade</th>
                  <th>Unit price</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td>{h.farmer_name ?? "—"}</td>
                    <td>{h.paddy_type_name ?? "—"}</td>
                    <td>{h.warehouse_name ?? "—"}</td>
                    <td>{Number(h.quantity_kg).toLocaleString()}</td>
                    <td>{h.grade ? `Grade ${h.grade}` : "—"}</td>
                    <td>{h.unit_price ? `Rs. ${Number(h.unit_price).toLocaleString()}` : "—"}</td>
                    <td>{h.purchase_date ?? h.harvest_date}</td>
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
    </div>
  );
}
