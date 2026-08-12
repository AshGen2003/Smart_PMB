/**
 * Create/edit modal forms for the driver's Vehicle Log page (fuel and
 * maintenance records) — the driver-owned counterpart to what used to be
 * on the officer's Transportation page. Same pattern as the other
 * Server-Action-backed modals in the app: useActionState, closes itself
 * once the save succeeds.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
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
  cost: string;
  fuel_date: string;
};

export function FuelRecordFormModal({
  mode,
  record,
  vehicles,
  onClose,
}: {
  mode: "create" | "edit";
  record?: EditableFuelRecord;
  vehicles: VehicleOption[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createFuelRecord : updateFuelRecord.bind(null, record!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useAutoClose(pending, state.error, onClose);

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
            <input id="quantity_litres" name="quantity_litres" type="number" step="0.01" min={0} required defaultValue={record?.quantity_litres} className={styles.input} />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cost">Cost (Rs.)</label>
            <input id="cost" name="cost" type="number" step="0.01" min={0} required defaultValue={record?.cost} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fuel_date">Date</label>
            <StyledDatePicker id="fuel_date" name="fuel_date" required defaultValue={record?.fuel_date} />
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
  description: string;
  cost: string;
  next_service_date: string | null;
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
          <label className={styles.label} htmlFor="description">Description <span className={styles.optional}>(optional)</span></label>
          <input id="description" name="description" type="text" defaultValue={record?.description} className={styles.input} placeholder="e.g. Oil change, brake service" />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="service_date">Service date</label>
            <StyledDatePicker id="service_date" name="service_date" required defaultValue={record?.service_date} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cost">Cost (Rs.)</label>
            <input id="cost" name="cost" type="number" step="0.01" min={0} defaultValue={record?.cost} className={styles.input} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="next_service_date">Next service date <span className={styles.optional}>(optional)</span></label>
          <StyledDatePicker id="next_service_date" name="next_service_date" defaultValue={record?.next_service_date ?? ""} />
        </div>
        <FormFooter pending={pending} onClose={onClose} />
      </form>
    </ModalShell>
  );
}
