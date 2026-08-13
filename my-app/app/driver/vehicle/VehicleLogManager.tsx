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
  type CompletedDeliveryOption,
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
  price_per_litre: string | null;
  cost: string;
  fuel_date: string;
  delivery: number | null;
  delivery_label: string | null;
};

export type MaintenanceRecordRow = {
  id: number;
  vehicle: number;
  vehicle_registration: string | null;
  service_date: string;
  service_type: string;
  description: string;
  cost: string;
  odometer_km: number | null;
  next_service_date: string | null;
  next_service_due_km: number | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by_name: string | null;
  rejection_reason: string;
};

// Compact labels for the table cell -- SERVICE_TYPE_OPTIONS in
// VehicleLogFormModals.tsx uses longer dropdown copy (with the 50,000 km
// hint for Oil Change) that's too verbose for a table column.
const SERVICE_TYPE_LABEL: Record<string, string> = {
  oil_change: "Oil Change",
  tire_service: "Tire Service",
  brake_service: "Brake Service",
  battery_replacement: "Battery Replacement",
  air_filter: "Air Filter",
  fuel_filter: "Fuel Filter",
  coolant_service: "Coolant Service",
  clutch_transmission: "Clutch/Transmission",
  suspension_service: "Suspension Service",
  wheel_alignment: "Wheel Alignment",
  ac_service: "AC Service",
  general_inspection: "General Inspection",
  other: "Other",
};

type Tab = "fuel" | "maintenance";

export default function VehicleLogManager({
  vehicles,
  fuelRecords,
  maintenanceRecords,
  completedDeliveries,
}: {
  vehicles: VehicleOption[];
  fuelRecords: FuelRecordRow[];
  maintenanceRecords: MaintenanceRecordRow[];
  completedDeliveries: CompletedDeliveryOption[];
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
                      <th>Vehicle</th><th>Fuel</th><th>Quantity (L)</th><th>Price/L (Rs.)</th><th>Cost (Rs.)</th><th>Date</th><th>Trip</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelRecords.map((f) => (
                      <tr key={f.id}>
                        <td>{f.vehicle_registration ?? "—"}</td>
                        <td>{f.fuel_type}</td>
                        <td>{Number(f.quantity_litres).toLocaleString()}</td>
                        <td>{f.price_per_litre ? Number(f.price_per_litre).toLocaleString() : "—"}</td>
                        <td>{Number(f.cost).toLocaleString()}</td>
                        <td>{f.fuel_date}</td>
                        <td>{f.delivery_label ?? "—"}</td>
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
                      <th>Vehicle</th><th>Type</th><th>Description</th><th>Service date</th><th>Odometer (km)</th><th>Cost (Rs.)</th><th>Next service</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRecords.map((m) => {
                      const locked = m.status !== "pending";
                      return (
                      <tr key={m.id}>
                        <td>{m.vehicle_registration ?? "—"}</td>
                        <td>{SERVICE_TYPE_LABEL[m.service_type] ?? m.service_type}</td>
                        <td>{m.description || "—"}</td>
                        <td>{m.service_date}</td>
                        <td>{m.odometer_km != null ? m.odometer_km.toLocaleString() : "—"}</td>
                        <td>{Number(m.cost).toLocaleString()}</td>
                        <td>
                          {m.next_service_date || (m.next_service_due_km != null ? `${m.next_service_due_km.toLocaleString()} km` : "—")}
                        </td>
                        <td>
                          <span
                            className={clsx(
                              styles.badge,
                              m.status === "approved" && styles.badgeApproved,
                              m.status === "rejected" && styles.badgeRejected
                            )}
                          >
                            {m.status}
                          </span>
                          {m.status === "rejected" && m.rejection_reason && (
                            <p className={styles.rejectionReason}>{m.rejection_reason}</p>
                          )}
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Edit maintenance record"
                              title={locked ? "Already reviewed — can't be edited" : "Edit"}
                              disabled={locked}
                              onClick={() => setMaintenanceModal({ mode: "edit", row: m })}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.deleteIconBtn)}
                              aria-label="Delete maintenance record"
                              title={locked ? "Already reviewed — can't be deleted" : "Delete"}
                              disabled={isPending || locked}
                              onClick={() => handleDelete(`maintenance record #${m.id}`, () => deleteMaintenanceRecord(m.id))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {fuelModal?.mode === "create" && <FuelRecordFormModal mode="create" vehicles={vehicles} completedDeliveries={completedDeliveries} onClose={() => setFuelModal(null)} />}
      {fuelModal?.mode === "edit" && <FuelRecordFormModal mode="edit" record={fuelModal.row} vehicles={vehicles} completedDeliveries={completedDeliveries} onClose={() => setFuelModal(null)} />}

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
