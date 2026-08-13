/**
 * Create/edit modal forms for the driver's Vehicle Log page (fuel and
 * maintenance records) — the driver-owned counterpart to what used to be
 * on the officer's Transportation page. Same pattern as the other
 * Server-Action-backed modals in the app: useActionState, closes itself
 * once the save succeeds.
 */
"use client";

import React, { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { Loader2, X } from "lucide-react";
import {
  createFuelRecord,
  updateFuelRecord,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  type DriverFormState,
} from "@/app/actions/driver";
import StyledSelect from "@/app/components/StyledSelect";
import StyledDatePicker from "@/app/components/StyledDatePicker";
import styles from "./VehicleLog.module.css";
import type { VehicleOption } from "./VehicleLogManager";

// Common service items for this fleet -- mirrors
// MaintenanceRecord.ServiceType in farmers/models.py exactly (codenames
// must match what the backend accepts). Only Oil Change has a known
// distance interval today (SERVICE_INTERVALS_KM), so it's the only type
// whose next_service_date/next_service_due_km get recalculated server-side
// after save -- see MaintenanceRecordSerializer.
export const SERVICE_TYPE_OPTIONS = [
  { value: "oil_change", label: "Oil Change (next due every 50,000 km)" },
  { value: "tire_service", label: "Tire Replacement/Rotation" },
  { value: "brake_service", label: "Brake Service" },
  { value: "battery_replacement", label: "Battery Replacement" },
  { value: "air_filter", label: "Air Filter Replacement" },
  { value: "fuel_filter", label: "Fuel Filter Replacement" },
  { value: "coolant_service", label: "Coolant/Radiator Service" },
  { value: "clutch_transmission", label: "Clutch/Transmission Service" },
  { value: "suspension_service", label: "Suspension/Shock Absorber Service" },
  { value: "wheel_alignment", label: "Wheel Alignment & Balancing" },
  { value: "ac_service", label: "AC Service" },
  { value: "general_inspection", label: "General Inspection" },
  { value: "other", label: "Other" },
];

// Mirrors SERVICE_INTERVALS_KM's keys in farmers/models.py -- these types
// get next_service_date/next_service_due_km recalculated server-side, so
// the date picker for them is disabled here rather than letting the driver
// enter a value that'll just be overwritten on save.
const SERVICE_TYPES_WITH_INTERVAL = new Set(["oil_change"]);

const initialState: DriverFormState = {};

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

export type EditableFuelRecord = {
  id: number;
  vehicle: number;
  fuel_type: string;
  quantity_litres: string;
  price_per_litre: string | null;
  fuel_date: string;
  delivery: number | null;
};

export type CompletedDeliveryOption = { id: number; label: string };

export function FuelRecordFormModal({
  mode,
  record,
  vehicles,
  completedDeliveries,
  onClose,
}: {
  mode: "create" | "edit";
  record?: EditableFuelRecord;
  vehicles: VehicleOption[];
  completedDeliveries: CompletedDeliveryOption[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createFuelRecord : updateFuelRecord.bind(null, record!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useAutoClose(pending, state.error, onClose);

  // Cost is server-computed (price_per_litre * quantity_litres, see
  // FuelRecordSerializer) and never actually submitted — these two just
  // drive a live preview so the driver sees the total before saving.
  const [pricePerLitre, setPricePerLitre] = useState(record?.price_per_litre ?? "");
  const [quantityLitres, setQuantityLitres] = useState(record?.quantity_litres ?? "");
  const costPreview = useMemo(() => {
    const price = Number(pricePerLitre);
    const quantity = Number(quantityLitres);
    if (!pricePerLitre || !quantityLitres || Number.isNaN(price) || Number.isNaN(quantity)) return null;
    return (price * quantity).toFixed(2);
  }, [pricePerLitre, quantityLitres]);

  return (
    <ModalShell title={mode === "create" ? "New fuel record" : "Edit fuel record"} onClose={onClose} error={state.error}>
      <form action={formAction}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vehicle">Vehicle</label>
          <StyledSelect
            id="vehicle"
            name="vehicle"
            required
            defaultValue={record?.vehicle != null ? String(record.vehicle) : undefined}
            placeholder="Select a vehicle"
            options={vehicles.map((v) => ({ value: String(v.id), label: v.registration_no }))}
          />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fuel_type">Fuel type</label>
            <StyledSelect
              id="fuel_type"
              name="fuel_type"
              defaultValue={record?.fuel_type ?? "diesel"}
              options={[
                { value: "petrol", label: "Petrol" },
                { value: "diesel", label: "Diesel" },
                { value: "cng", label: "CNG" },
              ]}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="quantity_litres">Quantity (L)</label>
            <input
              id="quantity_litres" name="quantity_litres" type="number" step="0.01" min={0} required
              value={quantityLitres} onChange={(e) => setQuantityLitres(e.target.value)} className={styles.input}
            />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="price_per_litre">Price per litre (Rs.)</label>
            <input
              id="price_per_litre" name="price_per_litre" type="number" step="0.01" min={0} required
              value={pricePerLitre} onChange={(e) => setPricePerLitre(e.target.value)} className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Total cost</label>
            <div className={styles.computedValue}>{costPreview ? `Rs. ${costPreview}` : "—"}</div>
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fuel_date">Date</label>
            <StyledDatePicker id="fuel_date" name="fuel_date" required defaultValue={record?.fuel_date} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="delivery">Trip <span className={styles.optional}>(optional)</span></label>
            <StyledSelect
              id="delivery"
              name="delivery"
              defaultValue={record?.delivery != null ? String(record.delivery) : undefined}
              placeholder="Not linked to a trip"
              options={completedDeliveries.map((d) => ({ value: String(d.id), label: d.label }))}
            />
          </div>
        </div>
        <FormFooter pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

export type EditableMaintenanceRecord = {
  id: number;
  vehicle: number;
  service_date: string;
  service_type: string;
  description: string;
  cost: string;
  odometer_km: number | null;
  next_service_date: string | null;
  next_service_due_km: number | null;
};

export function MaintenanceRecordFormModal({
  mode,
  record,
  vehicles,
  onClose,
}: {
  mode: "create" | "edit";
  record?: EditableMaintenanceRecord;
  vehicles: VehicleOption[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createMaintenanceRecord : updateMaintenanceRecord.bind(null, record!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useAutoClose(pending, state.error, onClose);

  const [serviceType, setServiceType] = useState(record?.service_type ?? "other");
  const hasKnownInterval = SERVICE_TYPES_WITH_INTERVAL.has(serviceType);

  return (
    <ModalShell title={mode === "create" ? "New maintenance record" : "Edit maintenance record"} onClose={onClose} error={state.error}>
      <form action={formAction}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vehicle">Vehicle</label>
          <StyledSelect
            id="vehicle"
            name="vehicle"
            required
            defaultValue={record?.vehicle != null ? String(record.vehicle) : undefined}
            placeholder="Select a vehicle"
            options={vehicles.map((v) => ({ value: String(v.id), label: v.registration_no }))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="service_type">Service type</label>
          <StyledSelect
            id="service_type"
            name="service_type"
            required
            value={serviceType}
            onChange={setServiceType}
            options={SERVICE_TYPE_OPTIONS}
          />
        </div>
        {serviceType === "other" && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">Describe the maintenance</label>
            <input
              id="description" name="description" type="text" required={serviceType === "other"}
              defaultValue={record?.description} className={styles.input}
              placeholder="e.g. Windscreen replacement"
            />
          </div>
        )}
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="service_date">Service date</label>
            <StyledDatePicker id="service_date" name="service_date" required defaultValue={record?.service_date} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="odometer_km">Odometer (km)</label>
            <input id="odometer_km" name="odometer_km" type="number" step="1" min={0} required defaultValue={record?.odometer_km ?? undefined} className={styles.input} />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cost">Cost (Rs.)</label>
            <input id="cost" name="cost" type="number" step="0.01" min={0} defaultValue={record?.cost} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="next_service_date">
              Next service date {hasKnownInterval ? <span className={styles.optional}>(recalculated after save)</span> : <span className={styles.optional}>(optional)</span>}
            </label>
            <StyledDatePicker id="next_service_date" name="next_service_date" defaultValue={record?.next_service_date ?? ""} disabled={hasKnownInterval} />
          </div>
        </div>
        {mode === "edit" && record?.next_service_due_km != null && (
          <div className={styles.field}>
            <label className={styles.label}>Next service due at</label>
            <div className={styles.computedValue}>{record.next_service_due_km.toLocaleString()} km</div>
          </div>
        )}
        <FormFooter pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}
