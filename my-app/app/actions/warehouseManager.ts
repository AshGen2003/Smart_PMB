/**
 * Server Actions for the warehouse-manager portal's own warehouse — every
 * endpoint these call is scoped server-side to `Warehouse.managed_by ==
 * request.user` (see farmers/views.py), so there's no warehouseId param
 * here the way app/actions/warehouses.ts's officer/admin actions take one:
 * a manager only ever has the one warehouse they're appointed to.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type WarehouseManagerFormState = {
  error?: string;
};

/**
 * Adds or removes stock for one paddy type (+ optional grade) at the
 * logged-in manager's own warehouse. Mirrors actions/warehouses.ts's
 * adjustWarehouseStock, minus the warehouseId (implicit server-side).
 */
export async function adjustMyWarehouseStock(
  _prevState: WarehouseManagerFormState,
  formData: FormData
): Promise<WarehouseManagerFormState> {
  const res = await apiFetch("/api/warehouse-manager/adjust-stock/", {
    method: "POST",
    body: JSON.stringify({
      paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
      grade: String(formData.get("grade") ?? "") || null,
      quantity: String(formData.get("quantity") ?? ""),
      direction: String(formData.get("direction") ?? ""),
      notes: String(formData.get("notes") ?? "").trim(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouse-manager");
  return {};
}

/**
 * Resolves one of the logged-in manager's own warehouse capacity alerts
 * (reactive or predictive) — scoped server-side the same way as every
 * other action here, plus an alert_type check restricting this to just the
 * two warehouse-capacity alert types (see farmers/views.py's
 * WarehouseManagerResolveAlertView); nothing else is self-resolvable this
 * way.
 */
export async function resolveWarehouseAlert(alertId: number): Promise<WarehouseManagerFormState> {
  const res = await apiFetch(`/api/warehouse-manager/alerts/${alertId}/resolve/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Couldn't resolve this alert.") };
  }

  revalidatePath("/warehouse-manager");
  return {};
}

/**
 * Requests a transfer of stock (one paddy type + optional grade) from
 * another warehouse into the logged-in manager's own warehouse. The
 * source is client-chosen (`from_warehouse`); the destination is always
 * this manager's own warehouse, forced server-side (see farmers/views.py's
 * WarehouseManagerTransferRequestViewSet.perform_create) — never sent from
 * here. An officer with "manage_warehouses" reviews it from the
 * Warehouse Transfers admin page.
 */
export async function requestWarehouseTransfer(
  _prevState: WarehouseManagerFormState,
  formData: FormData
): Promise<WarehouseManagerFormState> {
  const res = await apiFetch("/api/warehouse-manager/transfer-requests/", {
    method: "POST",
    body: JSON.stringify({
      from_warehouse: formData.get("from_warehouse") ? Number(formData.get("from_warehouse")) : null,
      paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
      grade: String(formData.get("grade") ?? "") || null,
      quantity_kg: String(formData.get("quantity_kg") ?? ""),
      notes: String(formData.get("notes") ?? "").trim(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouse-manager");
  return {};
}

export type DeliverySlotLookupResult = {
  id: number;
  farmer_name: string | null;
  farmer_registration_no: string | null;
  paddy_type_name: string | null;
  estimated_quantity_kg: string;
  scheduled_date: string;
  status: "booked" | "arrived" | "completed" | "cancelled" | "no_show";
  booking_reference: string;
  checked_in_at: string | null;
};

/**
 * Looks up a farmer's delivery-slot booking by reference — scoped
 * server-side to warehouses this manager actually manages (see
 * farmers.views.WarehouseManagerDeliverySlotLookupView), same as every
 * other action in this file.
 */
export async function lookupDeliverySlot(
  ref: string
): Promise<{ slot?: DeliverySlotLookupResult; error?: string }> {
  const res = await apiFetch(`/api/warehouse-manager/delivery-slots/lookup/?ref=${encodeURIComponent(ref)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "No booking found with that reference for your warehouse.") };
  }

  return { slot: await res.json() };
}

/**
 * Updates a booking's status on physical arrival/departure/no-show (see
 * farmers.views.WarehouseManagerDeliverySlotCheckInView). Returns the
 * updated slot directly (not just `{}`) so the caller can update its
 * on-screen state without a second lookup round-trip.
 */
export async function checkInDeliverySlot(
  slotId: number,
  action: "arrived" | "completed" | "no_show"
): Promise<{ slot?: DeliverySlotLookupResult; error?: string }> {
  const res = await apiFetch(`/api/warehouse-manager/delivery-slots/${slotId}/check-in/`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  return { slot: await res.json() };
}

/**
 * Updates the logged-in manager's own warehouse's operational info — only
 * contact_number and status (see farmers/serializers.py's
 * WarehouseManagerSelfUpdateSerializer; anything else in the payload is
 * silently ignored server-side, but this action only ever sends these two
 * fields to begin with).
 */
export async function updateMyWarehouseInfo(
  _prevState: WarehouseManagerFormState,
  formData: FormData
): Promise<WarehouseManagerFormState> {
  const res = await apiFetch("/api/warehouse-manager/dashboard/", {
    method: "PATCH",
    body: JSON.stringify({
      contact_number: String(formData.get("contact_number") ?? "").trim(),
      status: String(formData.get("status") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouse-manager");
  return {};
}
