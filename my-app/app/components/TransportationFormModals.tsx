/**
 * Create/edit modal forms for the Transportation page's officer-managed
 * entity types (Vehicle/Route/Delivery). Fuel/maintenance records aren't
 * here — those are driver-owned now (see app/driver/VehicleLogFormModals.tsx)
 * and the officer side is read-only for them. Each form follows the same
 * pattern as WarehouseFormModal: a Server Action bound via useActionState,
 * closing itself once the save succeeds.
 */
"use client";

import React, { useEffect, useRef, useState, useActionState } from "react";
import { Loader2, X } from "lucide-react";
import {
  createVehicle,
  updateVehicle,
  createRoute,
  updateRoute,
  createDelivery,
  updateDelivery,
  type TransportFormState,
} from "@/app/actions/transportation";
import { LocationMap, LocationMapPlaceholder } from "@/app/components/LocationMap";
import styles from "./Transportation.module.css";
import { DELIVERY_STATUS_LABEL, type VehicleRow, type DriverOption, type RouteRow, type DeliveryRow } from "./TransportationManager";

const initialState: TransportFormState = {};

/** Shared modal chrome: overlay, header with close button, error banner, and the form itself. */
function ModalShell({
  title,
  onClose,
  error,
  children,
}: {
  title: string;
  onClose: () => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>{title}</div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          {error && <div className={styles.modalBanner}>{error}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Auto-closes the modal once a pending submission resolves without error. */
function useAutoClose(pending: boolean, error: string | undefined, onClose: () => void) {
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !error) onClose();
  }, [pending, error, onClose]);
}

function FormFooter({ pending, onClose }: { pending: boolean; onClose: () => void }) {
  return (
    <div className={styles.modalActions}>
      <button type="button" className={styles.secondaryBtn} onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className={styles.primaryBtn} disabled={pending}>
        {pending && <Loader2 size={16} className={styles.spin} />}
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

// --- Vehicle --------------------------------------------------------------

export function VehicleFormModal({
  mode,
  vehicle,
  onClose,
}: {
  mode: "create" | "edit";
  vehicle?: VehicleRow;
  onClose: () => void;
}) {
  const action = mode === "create" ? createVehicle : updateVehicle.bind(null, vehicle!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useAutoClose(pending, state.error, onClose);

  return (
    <ModalShell title={mode === "create" ? "New vehicle" : `Edit ${vehicle?.registration_no}`} onClose={onClose} error={state.error}>
      <form action={formAction}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="registration_no">Registration no.</label>
            <input id="registration_no" name="registration_no" type="text" required defaultValue={vehicle?.registration_no} className={styles.input} placeholder="e.g. NP-4521" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="capacity_kg">Capacity (kg)</label>
            <input id="capacity_kg" name="capacity_kg" type="number" min={1} required defaultValue={vehicle?.capacity_kg} className={styles.input} />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="vehicle_type">Vehicle type</label>
            <select id="vehicle_type" name="vehicle_type" defaultValue={vehicle?.vehicle_type ?? "lorry"} className={styles.input}>
              <option value="lorry">Lorry</option>
              <option value="van">Van</option>
              <option value="tractor">Tractor</option>
              <option value="three_wheeler">Three Wheeler</option>
              <option value="pickup">Pickup</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={vehicle?.status ?? "active"} className={styles.input}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="model">Model <span className={styles.optional}>(optional)</span></label>
            <input id="model" name="model" type="text" defaultValue={vehicle?.model} className={styles.input} placeholder="e.g. Tata 407" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="manufacture_year">Year <span className={styles.optional}>(optional)</span></label>
            <input id="manufacture_year" name="manufacture_year" type="number" min={1980} max={2100} defaultValue={vehicle?.manufacture_year ?? undefined} className={styles.input} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="size">Size <span className={styles.optional}>(optional)</span></label>
          <input id="size" name="size" type="text" defaultValue={vehicle?.size} className={styles.input} placeholder="e.g. 14ft, 6-wheeler" />
        </div>
        <FormFooter pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// --- Route --------------------------------------------------------------

export function RouteFormModal({
  mode,
  route,
  onClose,
}: {
  mode: "create" | "edit";
  route?: RouteRow;
  onClose: () => void;
}) {
  const action = mode === "create" ? createRoute : updateRoute.bind(null, route!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useAutoClose(pending, state.error, onClose);

  return (
    <ModalShell title={mode === "create" ? "New route" : `Edit route`} onClose={onClose} error={state.error}>
      <form action={formAction}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="origin">Origin</label>
            <input id="origin" name="origin" type="text" required defaultValue={route?.origin} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="destination">Destination</label>
            <input id="destination" name="destination" type="text" required defaultValue={route?.destination} className={styles.input} />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="distance_km">Distance (km)</label>
            <input id="distance_km" name="distance_km" type="number" step="0.1" min={0} required defaultValue={route?.distance_km} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="estimated_time">Est. travel time <span className={styles.optional}>(optional)</span></label>
            <input id="estimated_time" name="estimated_time" type="text" defaultValue={route?.estimated_time} className={styles.input} placeholder="e.g. 3h 20m" />
          </div>
        </div>
        <FormFooter pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// --- Delivery -----------------------------------------------------------

export type EditableDelivery = {
  id: number;
  vehicle: number;
  driver: string;
  route: number;
  warehouse: number | null;
  scheduled_date: string;
  status: string;
};

export function DeliveryFormModal({
  mode,
  delivery,
  vehicles,
  drivers,
  routes,
  warehouses,
  onClose,
}: {
  mode: "create" | "edit";
  delivery?: EditableDelivery;
  vehicles: VehicleRow[];
  drivers: DriverOption[];
  routes: RouteRow[];
  warehouses: { id: number; name: string }[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createDelivery : updateDelivery.bind(null, delivery!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useAutoClose(pending, state.error, onClose);

  return (
    <ModalShell title={mode === "create" ? "New delivery" : "Edit delivery"} onClose={onClose} error={state.error}>
      <form action={formAction}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="vehicle">Vehicle</label>
            <select id="vehicle" name="vehicle" required defaultValue={delivery?.vehicle ?? ""} className={styles.input}>
              <option value="" disabled>Select a vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registration_no}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="driver">Driver</label>
            <select id="driver" name="driver" required defaultValue={delivery?.driver ?? ""} className={styles.input}>
              <option value="" disabled>Select a driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="route">Route</label>
          <select id="route" name="route" required defaultValue={delivery?.route ?? ""} className={styles.input}>
            <option value="" disabled>Select a route</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>
            ))}
          </select>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="warehouse">Warehouse <span className={styles.optional}>(optional)</span></label>
            <select id="warehouse" name="warehouse" defaultValue={delivery?.warehouse ?? ""} className={styles.input}>
              <option value="">None</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scheduled_date">Scheduled date</label>
            <input id="scheduled_date" name="scheduled_date" type="date" required defaultValue={delivery?.scheduled_date} className={styles.input} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={delivery?.status ?? "scheduled"} className={styles.input}>
            <option value="scheduled">Scheduled</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <FormFooter pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

// --- Live tracking ----------------------------------------------------------

type LatestLocation = { latitude: number; longitude: number; recorded_at: string } | null;

// How often to re-poll the delivery's location while the tracking modal is
// open. Drivers only send a new ping every ~20s (see LocationReporter), so
// polling faster than that just re-fetches the same coordinates.
const TRACK_POLL_INTERVAL_MS = 15_000;

/**
 * Read-only modal: polls a single delivery's `latest_location` and shows it
 * on a live Google Map. `live=false` (Portal Preview) skips the network
 * poll entirely and just renders the sample delivery's static location —
 * preview must never fetch a real delivery by id, since a fake preview id
 * could collide with a real one and leak real GPS data (see
 * previewSampleData.ts).
 */
export function DeliveryTrackModal({
  delivery,
  onClose,
  live = true,
}: {
  delivery: DeliveryRow;
  onClose: () => void;
  live?: boolean;
}) {
  const [location, setLocation] = useState<LatestLocation>(delivery.latest_location ?? null);
  const [status, setStatus] = useState(delivery.status);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/admin/deliveries/${delivery.id}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setLocation(data.latest_location ?? null);
        setStatus(data.status);
      } catch {
        // Transient network hiccup — the next interval tick tries again.
      }
    }
    poll();
    const intervalId = setInterval(poll, TRACK_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [delivery.id, live]);

  return (
    <ModalShell title={`Track: ${delivery.vehicle_registration ?? "Delivery"}`} onClose={onClose}>
      {location ? (
        <LocationMap latitude={location.latitude} longitude={location.longitude} />
      ) : (
        <LocationMapPlaceholder message="No location reported yet — the driver hasn't started this trip." />
      )}
      <div className={styles.trackMeta}>
        <span className={styles.badge}>{DELIVERY_STATUS_LABEL[status] ?? status}</span>
        {location && (
          <span>Last updated {new Date(location.recorded_at).toLocaleTimeString()}</span>
        )}
      </div>
    </ModalShell>
  );
}

