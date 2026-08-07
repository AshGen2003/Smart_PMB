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
import { calculateRouteDistance } from "@/app/lib/routeDistance";
import StyledSelect from "@/app/components/StyledSelect";
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
            <StyledSelect
              id="vehicle_type"
              name="vehicle_type"
              defaultValue={vehicle?.vehicle_type ?? "lorry"}
              options={[
                { value: "lorry", label: "Lorry" },
                { value: "van", label: "Van" },
                { value: "tractor", label: "Tractor" },
                { value: "three_wheeler", label: "Three Wheeler" },
                { value: "pickup", label: "Pickup" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="status">Status</label>
            <StyledSelect
              id="status"
              name="status"
              defaultValue={vehicle?.status ?? "active"}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "maintenance", label: "Under Maintenance" },
                { value: "retired", label: "Retired" },
              ]}
            />
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

  const [origin, setOrigin] = useState(route?.origin ?? "");
  const [destination, setDestination] = useState(route?.destination ?? "");
  const [distanceKm, setDistanceKm] = useState(route?.distance_km ?? "");
  const [estimatedTime, setEstimatedTime] = useState(route?.estimated_time ?? "");
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Auto-calculates distance/travel time from origin+destination via
  // OpenRouteService (calculateRouteDistance, a Server Action so the API
  // key stays server-side) — debounced so it only fires once typing
  // settles, and never blocks submission if it fails (unrecognized
  // address, missing key, network error): the fields stay normal, editable
  // inputs the whole time, so a manual value always still works.
  useEffect(() => {
    if (!origin.trim() || !destination.trim()) return;
    const timer = setTimeout(() => {
      // Clearing the previous error and flipping to "calculating" both
      // happen here, inside the debounce callback, rather than
      // synchronously at the top of the effect — avoids an extra
      // cascading render on every keystroke for no visible benefit.
      setCalcError(null);
      setCalculating(true);
      calculateRouteDistance(origin, destination).then((result) => {
        setCalculating(false);
        if (!result.distanceKm || !result.estimatedTime) {
          // Logged rather than shown to the user — the specific reason
          // (unconfigured key, unrecognized address, ORS request failure)
          // is only useful for debugging.
          console.warn("Distance lookup failed:", result.error);
          setCalcError("Couldn't calculate distance for these locations — enter it manually.");
          return;
        }
        setDistanceKm(result.distanceKm);
        setEstimatedTime(result.estimatedTime);
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [origin, destination]);

  return (
    <ModalShell title={mode === "create" ? "New route" : `Edit route`} onClose={onClose} error={state.error}>
      <form action={formAction}>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="origin">Origin</label>
            <input
              id="origin"
              name="origin"
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="destination">Destination</label>
            <input
              id="destination"
              name="destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="distance_km">
              Distance (km) {calculating && <Loader2 size={12} className={styles.spin} />}
            </label>
            <input
              id="distance_km"
              name="distance_km"
              type="number"
              step="0.1"
              min={0}
              required
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="estimated_time">Est. travel time <span className={styles.optional}>(optional)</span></label>
            <input
              id="estimated_time"
              name="estimated_time"
              type="text"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className={styles.input}
              placeholder="e.g. 3h 20m"
            />
          </div>
        </div>
        {calcError && <p className={styles.calcNote}>{calcError}</p>}
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
            <StyledSelect
              id="vehicle"
              name="vehicle"
              required
              defaultValue={delivery?.vehicle != null ? String(delivery.vehicle) : undefined}
              placeholder="Select a vehicle"
              options={vehicles.map((v) => ({ value: String(v.id), label: v.registration_no }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="driver">Driver</label>
            <StyledSelect
              id="driver"
              name="driver"
              required
              defaultValue={delivery?.driver ?? undefined}
              placeholder="Select a driver"
              options={drivers.map((d) => ({ value: d.id, label: d.name }))}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="route">Route</label>
          <StyledSelect
            id="route"
            name="route"
            required
            defaultValue={delivery?.route != null ? String(delivery.route) : undefined}
            placeholder="Select a route"
            options={routes.map((r) => ({ value: String(r.id), label: `${r.origin} → ${r.destination}` }))}
          />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="warehouse">Warehouse <span className={styles.optional}>(optional)</span></label>
            <StyledSelect
              id="warehouse"
              name="warehouse"
              defaultValue={delivery?.warehouse != null ? String(delivery.warehouse) : ""}
              options={[{ value: "", label: "None" }, ...warehouses.map((w) => ({ value: String(w.id), label: w.name }))]}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="scheduled_date">Scheduled date</label>
            <input id="scheduled_date" name="scheduled_date" type="date" required defaultValue={delivery?.scheduled_date} className={styles.input} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">Status</label>
          <StyledSelect
            id="status"
            name="status"
            defaultValue={delivery?.status ?? "scheduled"}
            options={[
              { value: "scheduled", label: "Scheduled" },
              { value: "in_transit", label: "In Transit" },
              { value: "delivered", label: "Delivered" },
              { value: "delayed", label: "Delayed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
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
        <LocationMap
          latitude={location.latitude}
          longitude={location.longitude}
          destination={delivery.route_destination ?? undefined}
        />
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

// --- Maintenance review ----------------------------------------------------

/**
 * Reject-with-reason modal for a driver-logged maintenance record — the
 * reason is required (unlike the license-application reject flow, where
 * it's optional), so Reject stays disabled until something's typed.
 */
export function MaintenanceRejectModal({
  vehicleLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  vehicleLabel: string;
  pending: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <ModalShell title="Reject this maintenance cost?" onClose={onClose} error={error ?? undefined}>
      <p className={styles.readOnlyNote} style={{ marginBottom: "0.75rem" }}>
        Reject the maintenance cost logged for <strong>{vehicleLabel}</strong>. The driver will
        see the reason you give below.
      </p>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="maintenanceRejectReason">Reason</label>
        <textarea
          id="maintenanceRejectReason"
          className={styles.input}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Cost seems inflated compared to similar services."
        />
      </div>
      <div className={styles.modalActions}>
        <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={pending}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={() => onConfirm(reason.trim())}
          disabled={pending || !reason.trim()}
        >
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </ModalShell>
  );
}

