/**
 * Server Actions for managing warehouses — the physical collection points
 * that harvest records (actions/approvals.ts) can be assigned to. All
 * mutations revalidate the "/warehouses" page.
 */
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type WarehouseFormState = {
  error?: string;
};

// Maps a <form> submission to the JSON body Django's warehouse endpoint
// expects. Empty optional fields (established_date, district) are
// normalized to null rather than an empty string/NaN.
function payloadFromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? ""),
    status: String(formData.get("status") ?? "active"),
    contact_number: String(formData.get("contact_number") ?? "").trim(),
    established_date: String(formData.get("established_date") ?? "") || null,
    location: String(formData.get("location") ?? "").trim(),
    district: formData.get("district") ? Number(formData.get("district")) : null,
    managed_by: String(formData.get("managed_by") ?? "") || null,
  };
}

/**
 * Creates a new warehouse.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Warehouse fields — see payloadFromFormData.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/warehouses".
 */
export async function createWarehouse(
  _prevState: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  const res = await apiFetch("/api/admin/warehouses/", {
    method: "POST",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}

/**
 * Updates an existing warehouse's details.
 *
 * @param warehouseId ID of the warehouse to update (bound ahead of the
 *   useActionState-managed args by the calling form).
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Updated warehouse fields.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/warehouses".
 */
export async function updateWarehouse(
  warehouseId: number,
  _prevState: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/`, {
    method: "PATCH",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}

/**
 * Permanently deletes a warehouse. Django is expected to reject this if
 * harvest records still reference it, surfaced via `firstErrorMessage`.
 */
export async function deleteWarehouse(warehouseId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}

/**
 * Sets a warehouse to "inactive" without deleting it — used in place of
 * deleteWarehouse for PMB officers, who aren't allowed to permanently
 * remove a warehouse (see WarehousesManager.tsx: officers get a
 * "Deactivate" action instead of Delete, and inactive warehouses are then
 * filtered out of their own warehouse list).
 */
export async function deactivateWarehouse(warehouseId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "inactive" }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}

/**
 * Sets a warehouse back to "active" — the undo for deactivateWarehouse.
 * Lets a PMB officer reactivate a warehouse they (or another officer)
 * previously deactivated, without needing an admin.
 */
export async function reactivateWarehouse(warehouseId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active" }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}

/**
 * Manually adds or removes stock for one paddy type (+ optional grade) at
 * a warehouse, via WarehouseViewSet.adjust_stock. `direction` ("add" or
 * "remove") is expected as a hidden field in `formData` (see
 * WarehouseStockAdjustModal.tsx), since the same action backs both buttons.
 */
export async function adjustWarehouseStock(
  warehouseId: number,
  _prevState: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/adjust-stock/`, {
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

  // Inventory/transaction-log are fetched with plain apiFetch (no-store,
  // see lib/api.ts), not apiFetchCached — only the warehouse list itself
  // needs a tag invalidated; revalidatePath re-renders the page with fresh
  // reads of everything else.
  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}

/**
 * Resolves one warehouse-capacity SystemAlert (reactive over-capacity,
 * predictive, or low-stock) via WarehouseViewSet.resolve_alert — any
 * warehouse, not just one this account happens to manage, since a PMB
 * officer needs oversight across all of them (see the Alerts tab on
 * /warehouses).
 */
export async function resolveWarehouseCapacityAlert(alertId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/warehouses/alerts/${alertId}/resolve/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Couldn't resolve this alert.") };
  }

  revalidatePath("/warehouses");
  return {};
}

/**
 * Assigns this warehouse's manager via WarehouseViewSet.appoint_manager —
 * either an existing warehouse_manager account (`user_id` present in
 * `formData`) or a brand new one (`full_name`/`email` present instead).
 * Requires the "appoint_warehouse_managers" permission on the backend.
 */
export async function appointWarehouseManager(
  warehouseId: number,
  _prevState: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  const userId = String(formData.get("user_id") ?? "").trim();
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/appoint-manager/`, {
    method: "POST",
    body: JSON.stringify(
      userId
        ? { user_id: userId }
        : {
            email: String(formData.get("email") ?? "").trim(),
            full_name: String(formData.get("full_name") ?? "").trim(),
          }
    ),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  updateTag("warehouses");
  return {};
}
