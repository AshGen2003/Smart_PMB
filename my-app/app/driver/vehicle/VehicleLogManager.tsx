/**
 * Client Component for the driver's Vehicle Log page: tab-switches
 * between Fuel and Maintenance records, each a table with create/edit/
 * delete — mirrors the old officer-side Transportation fuel/maintenance
 * tabs, just moved here since drivers now own this data.
 */
"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Fuel, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { deleteFuelRecord, deleteMaintenanceRecord } from "@/app/actions/driver";
import {
  FuelRecordFormModal,
  MaintenanceRecordFormModal,
  type EditableFuelRecord,
  type EditableMaintenanceRecord,
} from "./VehicleLogFormModals";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "./VehicleLog.module.css";

export type VehicleOption = { id: number; registration_no: string };

export type FuelRecordRow = {
  id: number;
  vehicle: number;
  vehicle_registration: string | null;
  fuel_type: string;
  quantity_litres: string;
  cost: string;
  fuel_date: string;
};

export type MaintenanceRecordRow = {
  id: number;
  vehicle: number;
  vehicle_registration: string | null;
  service_date: string;
  description: string;
  cost: string;
  next_service_date: string | null;
};

type Tab = "fuel" | "maintenance";

export default function VehicleLogManager({
  vehicles,
  fuelRecords,
  maintenanceRecords,
}: {
  vehicles: VehicleOption[];
  fuelRecords: FuelRecordRow[];
  maintenanceRecords: MaintenanceRecordRow[];
}) {
  const [tab, setTab] = useState<Tab>("fuel");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fuelModal, setFuelModal] = useState<
    { mode: "create" } | { mode: "edit"; row: EditableFuelRecord } | null
  >(null);
  const [maintenanceModal, setMaintenanceModal] = useState<
    { mode: "create" } | { mode: "edit"; row: EditableMaintenanceRecord } | null
  >(null);

  const [deleteTarget, setDeleteTarget] = useState<
    { label: string; fn: () => Promise<{ error?: string }> } | null
  >(null);

  function handleDelete(label: string, fn: () => Promise<{ error?: string }>) {
    setDeleteTarget({ label, fn });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { fn } = deleteTarget;
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      setDeleteTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Vehicle Log</h1>
          <p className={styles.pageSubtitle}>Log fuel purchases and maintenance for any vehicle you drive.</p>
        </div>
      </div>

      <div className={styles.tabsRow}>
        <button
          type="button"
          className={clsx(styles.tab, tab === "fuel" && styles.tabActive)}
          onClick={() => setTab("fuel")}
        >
          Fuel
        </button>
        <button
          type="button"
          className={clsx(styles.tab, tab === "maintenance" && styles.tabActive)}
          onClick={() => setTab("maintenance")}
        >
          Maintenance
        </button>
      </div>

      {error && <div className={styles.banner}>{error}</div>}

      <div className={styles.container}>
        {tab === "fuel" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button type="button" className={styles.newBtn} onClick={() => setFuelModal({ mode: "create" })}>
                <Plus size={16} /> New fuel record
              </button>
            </div>
            {fuelRecords.length === 0 ? (
              <div className={styles.emptyState}><Fuel size={28} /> No fuel records yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle</th><th>Fuel</th><th>Quantity (L)</th><th>Cost (Rs.)</th><th>Date</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelRecords.map((f) => (
                      <tr key={f.id}>
                        <td>{f.vehicle_registration ?? "—"}</td>
                        <td>{f.fuel_type}</td>
                        <td>{Number(f.quantity_litres).toLocaleString()}</td>
                        <td>{Number(f.cost).toLocaleString()}</td>
                        <td>{f.fuel_date}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.iconBtn} aria-label="Edit fuel record" onClick={() => setFuelModal({ mode: "edit", row: f })}>
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.deleteIconBtn)}
                              aria-label="Delete fuel record"
                              disabled={isPending}
                              onClick={() => handleDelete(`fuel record #${f.id}`, () => deleteFuelRecord(f.id))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "maintenance" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button type="button" className={styles.newBtn} onClick={() => setMaintenanceModal({ mode: "create" })}>
                <Plus size={16} /> New maintenance record
              </button>
            </div>
            {maintenanceRecords.length === 0 ? (
              <div className={styles.emptyState}><Wrench size={28} /> No maintenance records yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle</th><th>Description</th><th>Service date</th><th>Cost (Rs.)</th><th>Next service</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRecords.map((m) => (
                      <tr key={m.id}>
                        <td>{m.vehicle_registration ?? "—"}</td>
                        <td>{m.description || "—"}</td>
                        <td>{m.service_date}</td>
                        <td>{Number(m.cost).toLocaleString()}</td>
                        <td>{m.next_service_date || "—"}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.iconBtn} aria-label="Edit maintenance record" onClick={() => setMaintenanceModal({ mode: "edit", row: m })}>
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.deleteIconBtn)}
                              aria-label="Delete maintenance record"
                              disabled={isPending}
                              onClick={() => handleDelete(`maintenance record #${m.id}`, () => deleteMaintenanceRecord(m.id))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {fuelModal?.mode === "create" && <FuelRecordFormModal mode="create" vehicles={vehicles} onClose={() => setFuelModal(null)} />}
      {fuelModal?.mode === "edit" && <FuelRecordFormModal mode="edit" record={fuelModal.row} vehicles={vehicles} onClose={() => setFuelModal(null)} />}

      {maintenanceModal?.mode === "create" && <MaintenanceRecordFormModal mode="create" vehicles={vehicles} onClose={() => setMaintenanceModal(null)} />}
      {maintenanceModal?.mode === "edit" && <MaintenanceRecordFormModal mode="edit" record={maintenanceModal.row} vehicles={vehicles} onClose={() => setMaintenanceModal(null)} />}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this record?"
          message={
            <>
              Delete <strong>{deleteTarget.label}</strong>? This cannot be undone.
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
    </div>
  );
}
