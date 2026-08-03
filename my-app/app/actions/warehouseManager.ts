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
      paddy_type: Number(formData.get("paddy_type")),
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
