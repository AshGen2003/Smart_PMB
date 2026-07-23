/**
 * Server Actions for the Transportation page: vehicles, routes, and
 * deliveries. Drivers aren't managed here — they're real User accounts
 * (role "driver") edited on the Users page. Fuel/maintenance records
 * aren't created here either — see app/actions/driver.ts — the officer
 * side is read-only for those (see farmers/views.py's FuelRecordViewSet/
 * MaintenanceRecordViewSet docstrings). All mutations revalidate
 * "/transportation".
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type TransportFormState = {
  error?: string;
};

async function submit(path: string, method: "POST" | "PATCH", body: unknown) {
  const res = await apiFetch(path, { method, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/transportation");
  return {};
}

async function remove(path: string) {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/transportation");
  return {};
}

// --- Vehicles ---------------------------------------------------------

function vehiclePayload(formData: FormData) {
  const manufactureYear = String(formData.get("manufacture_year") ?? "").trim();
  return {
    registration_no: String(formData.get("registration_no") ?? "").trim(),
    vehicle_type: String(formData.get("vehicle_type") ?? "lorry"),
    model: String(formData.get("model") ?? "").trim(),
    manufacture_year: manufactureYear ? Number(manufactureYear) : null,
    size: String(formData.get("size") ?? "").trim(),
    capacity_kg: Number(formData.get("capacity_kg") ?? 0),
    status: String(formData.get("status") ?? "active"),
  };
}

export async function createVehicle(_prevState: TransportFormState, formData: FormData) {
  return submit("/api/admin/vehicles/", "POST", vehiclePayload(formData));
}

export async function updateVehicle(id: number, _prevState: TransportFormState, formData: FormData) {
  return submit(`/api/admin/vehicles/${id}/`, "PATCH", vehiclePayload(formData));
}

export async function deleteVehicle(id: number) {
  return remove(`/api/admin/vehicles/${id}/`);
}

// --- Drivers ------------------------------------------------------------

// --- Routes ---------------------------------------------------------------

function routePayload(formData: FormData) {
  return {
    origin: String(formData.get("origin") ?? "").trim(),
    destination: String(formData.get("destination") ?? "").trim(),
    distance_km: String(formData.get("distance_km") ?? ""),
    estimated_time: String(formData.get("estimated_time") ?? "").trim(),
  };
}

export async function createRoute(_prevState: TransportFormState, formData: FormData) {
  return submit("/api/admin/routes/", "POST", routePayload(formData));
}

export async function updateRoute(id: number, _prevState: TransportFormState, formData: FormData) {
  return submit(`/api/admin/routes/${id}/`, "PATCH", routePayload(formData));
}

export async function deleteRoute(id: number) {
  return remove(`/api/admin/routes/${id}/`);
}

// --- Deliveries -------------------------------------------------------

function deliveryPayload(formData: FormData) {
  return {
    vehicle: Number(formData.get("vehicle")),
    driver: String(formData.get("driver") ?? ""),
    route: Number(formData.get("route")),
    warehouse: formData.get("warehouse") ? Number(formData.get("warehouse")) : null,
    scheduled_date: String(formData.get("scheduled_date") ?? ""),
    status: String(formData.get("status") ?? "scheduled"),
  };
}

export async function createDelivery(_prevState: TransportFormState, formData: FormData) {
  return submit("/api/admin/deliveries/", "POST", deliveryPayload(formData));
}

export async function updateDelivery(id: number, _prevState: TransportFormState, formData: FormData) {
  return submit(`/api/admin/deliveries/${id}/`, "PATCH", deliveryPayload(formData));
}

export async function deleteDelivery(id: number) {
  return remove(`/api/admin/deliveries/${id}/`);
}

/** Lightweight status-only update, used by the delivery table's inline status dropdown. */
export async function updateDeliveryStatus(id: number, newStatus: string) {
  const res = await apiFetch(`/api/admin/deliveries/${id}/update_status/`, {
    method: "POST",
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }
  revalidatePath("/transportation");
  return {};
}

