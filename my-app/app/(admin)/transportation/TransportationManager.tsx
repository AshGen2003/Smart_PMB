/**
 * Client Component for the Transportation page: tab-switches between
 * Vehicles / Routes / Deliveries / Fuel / Maintenance, plus a stats header
 * and an inline status dropdown on the Deliveries tab for quick status
 * changes without opening the modal.
 *
 * Vehicles/Routes/Deliveries have create/edit/delete (mirroring
 * WarehousesManager's pattern); Fuel and Maintenance are read-only here —
 * those are logged by the driver on their own Vehicle Log page now (see
 * app/driver/vehicle/), not the officer.
 *
 * Drivers are not a tab here — they're real User accounts (role "driver")
 * managed on the Users page, not a Transportation-owned roster. This page
 * only consumes a lightweight `drivers` option list to populate the
 * Delivery form's driver picker.
 */
"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Check, Fuel, MapPin, Pencil, Plus, Route as RouteIcon, Trash2, Truck, Wrench, X as XIcon } from "lucide-react";
import {
  deleteVehicle,
  deleteRoute,
  deleteDelivery,
  updateDeliveryStatus,
  approveMaintenanceRecord,
  rejectMaintenanceRecord,
} from "@/app/actions/transportation";
import {
  VehicleFormModal,
  RouteFormModal,
  DeliveryFormModal,
  DeliveryTrackModal,
  MaintenanceRejectModal,
  type EditableDelivery,
} from "./TransportationFormModals";
import StyledSelect from "@/app/components/StyledSelect";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "./Transportation.module.css";

export type VehicleRow = {
  id: number;
  registration_no: string;
  vehicle_type: string;
  model: string;
  manufacture_year: number | null;
  size: string;
  capacity_kg: number;
  status: "active" | "inactive" | "maintenance" | "retired";
};

/** A User account with the "driver" role — just enough to populate the Delivery form's picker. */
export type DriverOption = {
  id: string;
  name: string;
};

export type RouteRow = {
  id: number;
  origin: string;
  destination: string;
  distance_km: string;
  estimated_time: string;
};

export type DeliveryRow = {
  id: number;
  vehicle: number;
  vehicle_registration: string | null;
  driver: string;
  driver_name: string | null;
  route: number;
  route_label: string | null;
  warehouse: number | null;
  warehouse_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  scheduled_date: string;
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
  latest_location: { latitude: number; longitude: number; recorded_at: string } | null;
};

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
  status: "pending" | "approved" | "rejected";
  reviewed_by_name: string | null;
  rejection_reason: string;
};

type Stats = {
  vehicles_total: number;
  vehicles_active: number;
  drivers_total: number;
  drivers_available: number;
  deliveries_scheduled: number;
  deliveries_in_transit: number;
  fuel_cost_total: number;
  maintenance_cost_total: number;
};

type Tab = "vehicles" | "routes" | "deliveries" | "fuel" | "maintenance";

const TABS: { key: Tab; label: string }[] = [
  { key: "vehicles", label: "Vehicles" },
  { key: "routes", label: "Routes" },
  { key: "deliveries", label: "Deliveries" },
  { key: "fuel", label: "Fuel" },
  { key: "maintenance", label: "Maintenance" },
];

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  lorry: "Lorry", van: "Van", tractor: "Tractor",
  three_wheeler: "Three Wheeler", pickup: "Pickup", other: "Other",
};

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled", in_transit: "In Transit", delivered: "Delivered",
  delayed: "Delayed", cancelled: "Cancelled",
};

export default function TransportationManager({
  vehicles,
  drivers,
  routes,
  deliveries,
  fuelRecords,
  maintenanceRecords,
  warehouses,
  stats,
  canWrite = true,
}: {
  vehicles: VehicleRow[];
  drivers: DriverOption[];
  routes: RouteRow[];
  deliveries: DeliveryRow[];
  fuelRecords: FuelRecordRow[];
  maintenanceRecords: MaintenanceRecordRow[];
  warehouses: { id: number; name: string }[];
  stats: Stats;
  // False during Portal Preview — hides every create/edit/delete affordance.
  canWrite?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("vehicles");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [vehicleModal, setVehicleModal] = useState<
    { mode: "create" } | { mode: "edit"; row: VehicleRow } | null
  >(null);
  const [routeModal, setRouteModal] = useState<
    { mode: "create" } | { mode: "edit"; row: RouteRow } | null
  >(null);
  const [deliveryModal, setDeliveryModal] = useState<
    { mode: "create" } | { mode: "edit"; row: EditableDelivery } | null
  >(null);
  const [trackDelivery, setTrackDelivery] = useState<DeliveryRow | null>(null);

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

  const [approveMaintenanceTarget, setApproveMaintenanceTarget] = useState<MaintenanceRecordRow | null>(null);
  const [rejectMaintenanceTarget, setRejectMaintenanceTarget] = useState<MaintenanceRecordRow | null>(null);

  function confirmApproveMaintenance() {
    if (!approveMaintenanceTarget) return;
    const target = approveMaintenanceTarget;
    setError(null);
    startTransition(async () => {
      const result = await approveMaintenanceRecord(target.id);
      if (result.error) setError(result.error);
      setApproveMaintenanceTarget(null);
    });
  }

  function confirmRejectMaintenance(reason: string) {
    if (!rejectMaintenanceTarget) return;
    const target = rejectMaintenanceTarget;
    setError(null);
    startTransition(async () => {
      const result = await rejectMaintenanceRecord(target.id, reason);
      if (result.error) setError(result.error);
      else setRejectMaintenanceTarget(null);
    });
  }

  function handleStatusChange(deliveryId: number, newStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateDeliveryStatus(deliveryId, newStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Transportation</h1>
          <p className={styles.pageSubtitle}>Fleet, drivers, routes, and deliveries.</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active vehicles</div>
          <div className={styles.statValue}>{stats.vehicles_active} / {stats.vehicles_total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Available drivers</div>
          <div className={styles.statValue}>{stats.drivers_available} / {stats.drivers_total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In transit</div>
          <div className={styles.statValue}>{stats.deliveries_in_transit}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Scheduled</div>
          <div className={styles.statValue}>{stats.deliveries_scheduled}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Fuel cost (total)</div>
          <div className={styles.statValue}>Rs. {stats.fuel_cost_total.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Maintenance cost (total)</div>
          <div className={styles.statValue}>Rs. {stats.maintenance_cost_total.toLocaleString()}</div>
        </div>
      </div>

      {error && <div className={styles.banner}>{error}</div>}

      <div className={styles.tabsRow}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={clsx(styles.tab, tab === t.key && styles.tabActive)}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.container}>
        {tab === "vehicles" && (
          <>
            {canWrite && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button type="button" className={styles.newBtn} onClick={() => setVehicleModal({ mode: "create" })}>
                  <Plus size={16} /> New vehicle
                </button>
              </div>
            )}
            {vehicles.length === 0 ? (
              <div className={styles.emptyState}><Truck size={28} /> No vehicles yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Registration</th><th>Type</th><th>Model</th><th>Size</th><th>Capacity (kg)</th><th>Status</th>{canWrite && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.id}>
                        <td>{v.registration_no}</td>
                        <td>{VEHICLE_TYPE_LABEL[v.vehicle_type] ?? v.vehicle_type}</td>
                        <td>{v.model || "—"}{v.manufacture_year ? ` (${v.manufacture_year})` : ""}</td>
                        <td>{v.size || "—"}</td>
                        <td>{v.capacity_kg.toLocaleString()}</td>
                        <td><span className={styles.badge}>{v.status}</span></td>
                        {canWrite && (
                          <td>
                            <div className={styles.rowActions}>
                              <button type="button" className={styles.iconBtn} aria-label="Edit vehicle" onClick={() => setVehicleModal({ mode: "edit", row: v })}>
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.deleteIconBtn)}
                                aria-label="Delete vehicle"
                                disabled={isPending}
                                onClick={() => handleDelete(v.registration_no, () => deleteVehicle(v.id))}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "routes" && (
          <>
            {canWrite && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button type="button" className={styles.newBtn} onClick={() => setRouteModal({ mode: "create" })}>
                  <Plus size={16} /> New route
                </button>
              </div>
            )}
            {routes.length === 0 ? (
              <div className={styles.emptyState}><RouteIcon size={28} /> No routes yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Origin</th><th>Destination</th><th>Distance (km)</th><th>Est. time</th>{canWrite && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((r) => (
                      <tr key={r.id}>
                        <td>{r.origin}</td>
                        <td>{r.destination}</td>
                        <td>{Number(r.distance_km).toLocaleString()}</td>
                        <td>{r.estimated_time || "—"}</td>
                        {canWrite && (
                          <td>
                            <div className={styles.rowActions}>
                              <button type="button" className={styles.iconBtn} aria-label="Edit route" onClick={() => setRouteModal({ mode: "edit", row: r })}>
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.deleteIconBtn)}
                                aria-label="Delete route"
                                disabled={isPending}
                                onClick={() => handleDelete(`${r.origin} → ${r.destination}`, () => deleteRoute(r.id))}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "deliveries" && (
          <>
            {canWrite && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button type="button" className={styles.newBtn} onClick={() => setDeliveryModal({ mode: "create" })}>
                  <Plus size={16} /> New delivery
                </button>
              </div>
            )}
            {deliveries.length === 0 ? (
              <div className={styles.emptyState}><Truck size={28} /> No deliveries yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle</th><th>Driver</th><th>Route</th><th>Warehouse</th><th>Date</th><th>Task response</th><th>Status</th><th>Location</th>{canWrite && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id}>
                        <td>{d.vehicle_registration ?? "—"}</td>
                        <td>{d.driver_name ?? "—"}</td>
                        <td>{d.route_label ?? "—"}</td>
                        <td>{d.warehouse_name ?? "—"}</td>
                        <td>{d.scheduled_date}</td>
                        <td>
                          <span
                            className={clsx(
                              styles.badge,
                              d.assignment_status === "accepted" && styles.assignmentAccepted,
                              d.assignment_status === "rejected" && styles.assignmentRejected
                            )}
                          >
                            {d.assignment_status}
                          </span>
                        </td>
                        <td>
                          {canWrite ? (
                            <StyledSelect
                              compact
                              fitContent
                              value={d.status}
                              disabled={isPending}
                              onChange={(newStatus) => handleStatusChange(d.id, newStatus)}
                              options={Object.entries(DELIVERY_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                            />
                          ) : (
                            <span className={styles.badge}>{DELIVERY_STATUS_LABEL[d.status]}</span>
                          )}
                        </td>
                        <td>
                          {d.assignment_status === "accepted" ? (
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.trackBtn)}
                              aria-label="Track live location"
                              onClick={() => setTrackDelivery(d)}
                            >
                              <MapPin size={14} /> Track
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        {canWrite && (
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label="Edit delivery"
                                onClick={() =>
                                  setDeliveryModal({
                                    mode: "edit",
                                    row: {
                                      id: d.id,
                                      vehicle: d.vehicle,
                                      driver: d.driver,
                                      route: d.route,
                                      warehouse: d.warehouse,
                                      scheduled_date: d.scheduled_date,
                                      status: d.status,
                                    },
                                  })
                                }
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className={clsx(styles.iconBtn, styles.deleteIconBtn)}
                                aria-label="Delete delivery"
                                disabled={isPending}
                                onClick={() => handleDelete(`delivery #${d.id}`, () => deleteDelivery(d.id))}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "fuel" && (
          <>
            <p className={styles.readOnlyNote}>
              Fuel records are logged by drivers from their own Vehicle Log — view only here.
            </p>
            {fuelRecords.length === 0 ? (
              <div className={styles.emptyState}><Fuel size={28} /> No fuel records yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle</th><th>Fuel</th><th>Quantity (L)</th><th>Cost (Rs.)</th><th>Date</th>
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
            <p className={styles.readOnlyNote}>
              Maintenance records are logged by drivers from their own Vehicle Log —
              {canWrite ? " review the cost below." : " view only here."}
            </p>
            {maintenanceRecords.length === 0 ? (
              <div className={styles.emptyState}><Wrench size={28} /> No maintenance records yet.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle</th><th>Description</th><th>Service date</th><th>Cost (Rs.)</th><th>Next service</th><th>Status</th>{canWrite && <th></th>}
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
                          <span
                            className={clsx(
                              styles.badge,
                              m.status === "approved" && styles.assignmentAccepted,
                              m.status === "rejected" && styles.assignmentRejected
                            )}
                            title={m.status === "rejected" && m.rejection_reason ? m.rejection_reason : undefined}
                          >
                            {m.status}
                          </span>
                        </td>
                        {canWrite && (
                          <td>
                            {m.status === "pending" && (
                              <div className={styles.rowActions}>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Approve"
                                  title="Approve"
                                  onClick={() => setApproveMaintenanceTarget(m)}
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Reject"
                                  title="Reject"
                                  onClick={() => setRejectMaintenanceTarget(m)}
                                >
                                  <XIcon size={16} />
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
            )}
          </>
        )}
      </div>

      {vehicleModal?.mode === "create" && <VehicleFormModal mode="create" onClose={() => setVehicleModal(null)} />}
      {vehicleModal?.mode === "edit" && <VehicleFormModal mode="edit" vehicle={vehicleModal.row} onClose={() => setVehicleModal(null)} />}

      {routeModal?.mode === "create" && <RouteFormModal mode="create" onClose={() => setRouteModal(null)} />}
      {routeModal?.mode === "edit" && <RouteFormModal mode="edit" route={routeModal.row} onClose={() => setRouteModal(null)} />}

      {deliveryModal?.mode === "create" && (
        <DeliveryFormModal mode="create" vehicles={vehicles} drivers={drivers} routes={routes} warehouses={warehouses} onClose={() => setDeliveryModal(null)} />
      )}
      {deliveryModal?.mode === "edit" && (
        <DeliveryFormModal mode="edit" delivery={deliveryModal.row} vehicles={vehicles} drivers={drivers} routes={routes} warehouses={warehouses} onClose={() => setDeliveryModal(null)} />
      )}

      {trackDelivery && (
        <DeliveryTrackModal delivery={trackDelivery} live={canWrite} onClose={() => setTrackDelivery(null)} />
      )}

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

      {approveMaintenanceTarget && (
        <ConfirmModal
          title="Approve this maintenance cost?"
          message={
            <>
              Approve Rs. {Number(approveMaintenanceTarget.cost).toLocaleString()} for{" "}
              <strong>{approveMaintenanceTarget.vehicle_registration ?? "this vehicle"}</strong>?
            </>
          }
          confirmLabel="Approve"
          pendingLabel="Approving…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmApproveMaintenance}
          onClose={() => setApproveMaintenanceTarget(null)}
        />
      )}

      {rejectMaintenanceTarget && (
        <MaintenanceRejectModal
          vehicleLabel={rejectMaintenanceTarget.vehicle_registration ?? "this vehicle"}
          pending={isPending}
          error={error}
          onConfirm={confirmRejectMaintenance}
          onClose={() => setRejectMaintenanceTarget(null)}
        />
      )}
    </div>
  );
}
