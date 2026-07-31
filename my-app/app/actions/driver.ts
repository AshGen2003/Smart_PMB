/**
 * Server Actions for the driver portal: responding to an assigned task,
 * progressing an accepted task's status, and logging fuel/maintenance
 * against a vehicle. All mutations revalidate "/driver" (and "/driver/
 * vehicle" for the fuel/maintenance ones, which live on a separate page).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type DriverFormState = {
  error?: string;
};

/**
 * Accepts or rejects a pending delivery task assigned to the logged-in
 * driver. Called directly from a Client Component (see
 * app/driver/TaskActionButtons.tsx) inside a transition, not bound to a
 * plain `<form action>`, since the driver needs to see the returned error
 * (e.g. someone else already responded to this task) rather than have it
 * silently swallowed.
 */
export async function respondToTask(deliveryId: number, accept: boolean) {
  const res = await apiFetch(`/api/driver/deliveries/${deliveryId}/respond/`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/driver");
  return {};
}

/** Moves the driver's own accepted task forward: "in_transit" (Start Trip) or "delivered" (Mark Delivered). */
export async function updateTaskStatus(deliveryId: number, newStatus: "in_transit" | "delivered") {
  const res = await apiFetch(`/api/driver/deliveries/${deliveryId}/status/`, {
    method: "POST",
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/driver");
  return {};
}

async function submit(path: string, method: "POST" | "PATCH", body: unknown) {
  const res = await apiFetch(path, { method, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/driver/vehicle");
  return {};
}

async function remove(path: string) {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/driver/vehicle");
  return {};
}

// --- Fuel records -------------------------------------------------------

function fuelRecordPayload(formData: FormData) {
  return {
    vehicle: Number(formData.get("vehicle")),
    fuel_type: String(formData.get("fuel_type") ?? "diesel"),
    quantity_litres: String(formData.get("quantity_litres") ?? ""),
    cost: String(formData.get("cost") ?? ""),
    fuel_date: String(formData.get("fuel_date") ?? ""),
  };
}

export async function createFuelRecord(_prevState: DriverFormState, formData: FormData) {
  return submit("/api/driver/fuel-records/", "POST", fuelRecordPayload(formData));
}

export async function updateFuelRecord(id: number, _prevState: DriverFormState, formData: FormData) {
  return submit(`/api/driver/fuel-records/${id}/`, "PATCH", fuelRecordPayload(formData));
}

export async function deleteFuelRecord(id: number) {
  return remove(`/api/driver/fuel-records/${id}/`);
}

// --- Maintenance records --------------------------------------------------

function maintenanceRecordPayload(formData: FormData) {
  return {
    vehicle: Number(formData.get("vehicle")),
    service_date: String(formData.get("service_date") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    cost: String(formData.get("cost") ?? "0"),
    next_service_date: String(formData.get("next_service_date") ?? "") || null,
  };
}

export async function createMaintenanceRecord(_prevState: DriverFormState, formData: FormData) {
  return submit("/api/driver/maintenance-records/", "POST", maintenanceRecordPayload(formData));
}

export async function updateMaintenanceRecord(
  id: number,
  _prevState: DriverFormState,
  formData: FormData
) {
  return submit(`/api/driver/maintenance-records/${id}/`, "PATCH", maintenanceRecordPayload(formData));
}

export async function deleteMaintenanceRecord(id: number) {
  return remove(`/api/driver/maintenance-records/${id}/`);
}
