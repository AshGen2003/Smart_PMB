/**
 * Client Component for the warehouses page: a searchable card grid showing
 * stock-fill progress bars, plus create/edit/delete via a modal form and
 * Server Actions.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import {
  AlertTriangle,
  Check,
  ClipboardList,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import {
  deactivateWarehouse,
  deleteWarehouse,
  reactivateWarehouse,
  resolveWarehouseCapacityAlert,
} from "@/app/actions/warehouses";
import WarehouseFormModal, {
  type DistrictOption,
  type EditableWarehouse,
} from "./WarehouseFormModal";
import WarehouseDetailModal, {
  type InventoryLine,
  type TransactionLogEntry,
} from "./WarehouseDetailModal";
import type { PaddyTypeOption } from "./WarehouseStockAdjustModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "./Warehouses.module.css";

/** Shape of a warehouse row as returned by `GET /api/admin/warehouses/`. */
export type WarehouseRow = {
  id: number;
  name: string;
  code: string;
  capacity: string;
  current_stock: string;
  status: "active" | "inactive" | "full" | "under_maintenance";
  contact_number: string;
  established_date: string | null;
  district: number | null;
  district_name: string | null;
  province: number | null;
  province_name: string | null;
  location: string;
  managed_by: string | null;
  managed_by_name: string | null;
  utilization_pct: number;
  remaining_capacity: string;
};

export type OfficerOption = { id: string; name: string; role: "pmb_officer" | "warehouse_manager" };

/** One warehouse-capacity SystemAlert, as returned by GET /api/admin/warehouses/alerts/. */
export type AlertRow = {
  id: number;
  alert_type: string;
  level: "info" | "warning" | "critical";
  message: string;
  status: "open" | "acknowledged" | "resolved";
  handled_by_email: string | null;
  created_at: string;
  resolved_at: string | null;
};

const STATUS_LABEL: Record<WarehouseRow["status"], string> = {
  active: "Active",
  inactive: "Inactive",
  full: "Full",
  under_maintenance: "Under Maintenance",
};

const STATUS_TINT: Record<WarehouseRow["status"], string> = {
  active: styles.tintGreen,
  inactive: styles.tintNeutral,
  full: styles.tintGold,
  under_maintenance: styles.tintBlue,
};

/** Renders the search bar and the warehouse card grid; owns the create/edit modal and delete-confirmation flow. */
export default function WarehousesManager({
  warehouses,
  districts,
  officers,
  inventory,
  transactions,
  paddyTypes,
  alerts,
  permissions,
  canWrite = true,
  role,
}: {
  warehouses: WarehouseRow[];
  districts: DistrictOption[];
  officers: OfficerOption[];
  inventory: InventoryLine[];
  transactions: TransactionLogEntry[];
  paddyTypes: PaddyTypeOption[];
  alerts: AlertRow[];
  permissions: string[];
  // False for viewers who can only see warehouses (Portal Preview, or a
  // future read-only role) — hides the create/edit/delete affordances.
  canWrite?: boolean;
  // PMB officers can't permanently delete a warehouse — they get a
  // "Deactivate" action instead (see canDelete/canDeactivate below), and
  // inactive warehouses are then hidden from their own list.
  role: string;
}) {
  const [tab, setTab] = useState<"warehouses" | "alerts" | "deactivated">("warehouses");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; warehouse: EditableWarehouse } | null
  >(null);
  const [detailWarehouse, setDetailWarehouse] = useState<WarehouseRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOfficer = role === "pmb_officer";
  const canDelete = canWrite && !isOfficer;
  const canDeactivate = canWrite && isOfficer;

  const filtered = useMemo(() => {
    // Officers can only deactivate (never delete) a warehouse, so an
    // inactive one is hidden from their list instead — admins still see
    // and manage every status.
    const visible = isOfficer ? warehouses.filter((w) => w.status !== "inactive") : warehouses;
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.district_name ?? "").toLowerCase().includes(q)
    );
  }, [warehouses, query, isOfficer]);

  // Warehouses this officer previously deactivated (hidden from the main
  // list above) — surfaced in their own tab so they can reactivate one.
  const deactivatedWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === "inactive"),
    [warehouses]
  );

  const openAlertCount = useMemo(
    () => alerts.filter((a) => a.status === "open").length,
    [alerts]
  );

  const [deleteTarget, setDeleteTarget] = useState<WarehouseRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<WarehouseRow | null>(null);

  function handleDelete(warehouse: WarehouseRow) {
    setDeleteTarget(warehouse);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteWarehouse(target.id);
      if (result.error) setDeleteError(result.error);
      setDeleteTarget(null);
    });
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deactivateWarehouse(target.id);
      if (result.error) setDeleteError(result.error);
      setDeactivateTarget(null);
    });
  }

  function handleReactivate(warehouse: WarehouseRow) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await reactivateWarehouse(warehouse.id);
      if (result.error) setDeleteError(result.error);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Warehouses</h1>

        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search warehouses..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {canWrite && (
            <button
              type="button"
              className={styles.newBtn}
              onClick={() => setModal({ mode: "create" })}
            >
              <Plus size={16} /> New warehouse
            </button>
          )}
        </div>
      </div>

      <div className={styles.tabsRow}>
        <button
          type="button"
          className={clsx(styles.tab, tab === "warehouses" && styles.tabActive)}
          onClick={() => setTab("warehouses")}
        >
          <WarehouseIcon size={15} />
          All warehouses
        </button>
        <button
          type="button"
          className={clsx(styles.tab, tab === "alerts" && styles.tabActive)}
          onClick={() => setTab("alerts")}
        >
          <AlertTriangle size={15} />
          Alerts
          {openAlertCount > 0 && <span className={styles.tabCount}>{openAlertCount}</span>}
        </button>
        {canDeactivate && (
          <button
            type="button"
            className={clsx(styles.tab, tab === "deactivated" && styles.tabActive)}
            onClick={() => setTab("deactivated")}
          >
            <EyeOff size={15} />
            Deactivated
            {deactivatedWarehouses.length > 0 && (
              <span className={styles.tabCount}>{deactivatedWarehouses.length}</span>
            )}
          </button>
        )}
      </div>

      {deleteError && <div className={styles.banner}>{deleteError}</div>}

      {tab === "warehouses" && (
      <div className={styles.container}>
        <h2 className={styles.sectionLabel}>All warehouses</h2>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((w) => {
              // Fill percentage for the stock progress bar; guard against
              // divide-by-zero for warehouses with no capacity set.
              const pct = Number(w.capacity) > 0 ? (Number(w.current_stock) / Number(w.capacity)) * 100 : 0;
              return (
                <div key={w.id} className={clsx(styles.card, STATUS_TINT[w.status])}>
                  <div className={styles.cardHeader}>
                    <div className={styles.titleRow}>
                      <span className={styles.icon}>
                        <WarehouseIcon size={18} />
                      </span>
                      <div>
                        <div className={styles.name}>{w.name}</div>
                        <div className={styles.code}>{w.code}</div>
                      </div>
                    </div>
                    <span className={styles.statusBadge}>{STATUS_LABEL[w.status]}</span>
                  </div>

                  <div className={styles.stockRow}>
                    <span>
                      {Number(w.current_stock).toLocaleString()} / {Number(w.capacity).toLocaleString()} kg
                    </span>
                    <span className={styles.stockPct}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className={styles.stockBarTrack}>
                    <div
                      className={styles.stockBarFill}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  {(w.district_name || w.location || w.managed_by_name) && (
                    <p className={styles.meta}>
                      {[w.district_name, w.location].filter(Boolean).join(" · ")}
                      {w.managed_by_name && ` · Managed by ${w.managed_by_name}`}
                    </p>
                  )}

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => setDetailWarehouse(w)}
                    >
                      <ClipboardList size={14} /> View
                    </button>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() =>
                            setModal({
                              mode: "edit",
                              warehouse: {
                                id: w.id,
                                name: w.name,
                                code: w.code,
                                capacity: w.capacity,
                                status: w.status,
                                contact_number: w.contact_number,
                                established_date: w.established_date,
                                district: w.district,
                                location: w.location,
                                managed_by: w.managed_by,
                              },
                            })
                          }
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            className={styles.deleteIconBtn}
                            aria-label="Delete warehouse"
                            disabled={isPending}
                            onClick={() => handleDelete(w)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {canDeactivate && (
                          <button
                            type="button"
                            className={styles.deleteIconBtn}
                            aria-label="Deactivate and hide warehouse"
                            title="Make inactive and hide"
                            disabled={isPending}
                            onClick={() => setDeactivateTarget(w)}
                          >
                            <EyeOff size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>No warehouses match your search.</p>
        )}
      </div>
      )}

      {tab === "alerts" && (
        <div className={styles.container}>
          <h2 className={styles.sectionLabel}>Warehouse alerts</h2>
          {alerts.length > 0 ? (
            <div className={styles.alertList}>
              {alerts.map((a) => (
                <AlertItem key={a.id} alert={a} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No warehouse alerts recorded yet.</p>
          )}
        </div>
      )}

      {tab === "deactivated" && (
        <div className={styles.container}>
          <h2 className={styles.sectionLabel}>Deactivated warehouses</h2>
          {deactivatedWarehouses.length > 0 ? (
            <div className={styles.grid}>
              {deactivatedWarehouses.map((w) => (
                <div key={w.id} className={clsx(styles.card, STATUS_TINT[w.status])}>
                  <div className={styles.cardHeader}>
                    <div className={styles.titleRow}>
                      <span className={styles.icon}>
                        <WarehouseIcon size={18} />
                      </span>
                      <div>
                        <div className={styles.name}>{w.name}</div>
                        <div className={styles.code}>{w.code}</div>
                      </div>
                    </div>
                    <span className={styles.statusBadge}>{STATUS_LABEL[w.status]}</span>
                  </div>

                  {(w.district_name || w.location || w.managed_by_name) && (
                    <p className={styles.meta}>
                      {[w.district_name, w.location].filter(Boolean).join(" · ")}
                      {w.managed_by_name && ` · Managed by ${w.managed_by_name}`}
                    </p>
                  )}

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      disabled={isPending}
                      onClick={() => handleReactivate(w)}
                    >
                      <RotateCcw size={14} /> Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No deactivated warehouses.</p>
          )}
        </div>
      )}

      {modal?.mode === "create" && (
        <WarehouseFormModal
          mode="create"
          districts={districts}
          officers={officers}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <WarehouseFormModal
          mode="edit"
          warehouse={modal.warehouse}
          districts={districts}
          officers={officers}
          onClose={() => setModal(null)}
        />
      )}

      {detailWarehouse && (
        <WarehouseDetailModal
          warehouse={detailWarehouse}
          inventory={inventory.filter((i) => i.warehouse === detailWarehouse.id)}
          transactions={transactions.filter((t) => t.warehouse === detailWarehouse.id)}
          paddyTypes={paddyTypes}
          managers={officers.filter((o) => o.role === "warehouse_manager")}
          permissions={permissions}
          canWrite={canWrite}
          onClose={() => setDetailWarehouse(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this warehouse?"
          message={
            <>
              Delete <strong>&quot;{deleteTarget.name}&quot;</strong>? This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          variant="danger"
          pending={isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {deactivateTarget && (
        <ConfirmModal
          title="Make this warehouse inactive?"
          message={
            <>
              <strong>&quot;{deactivateTarget.name}&quot;</strong> will be marked inactive and
              hidden from your warehouse list. You can reactivate it anytime from the
              Deactivated tab.
            </>
          }
          confirmLabel="Deactivate"
          pendingLabel="Deactivating…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmDeactivate}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
    </div>
  );
}

const ALERT_STATUS_LABEL: Record<AlertRow["status"], string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

const ALERT_STATUS_BADGE_CLASS: Record<AlertRow["status"], string> = {
  open: "badge-critical",
  acknowledged: "badge-warning",
  resolved: "badge-success",
};

/** One warehouse-alert row with its own resolve button — own pending/error state so resolving one alert doesn't disable the others. */
function AlertItem({ alert }: { alert: AlertRow }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveWarehouseCapacityAlert(alert.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={styles.alertItem}>
      <AlertTriangle size={16} />
      <div className={styles.alertItemBody}>
        <div className={styles.alertItemTopRow}>
          <span className={clsx(styles.badge, styles[ALERT_STATUS_BADGE_CLASS[alert.status]])}>
            {ALERT_STATUS_LABEL[alert.status]}
          </span>
        </div>
        <span className={styles.alertItemMessage}>{alert.message}</span>
        <span className={styles.alertItemMeta}>
          {format(new Date(alert.created_at), "MMM d, yyyy h:mm a")}
        </span>
        {error && <span className={styles.alertItemError}>{error}</span>}
      </div>
      {alert.status !== "resolved" && (
        <button
          type="button"
          className={styles.resolveBtn}
          disabled={isPending}
          onClick={handleResolve}
        >
          {isPending ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
          Resolve
        </button>
      )}
    </div>
  );
}
