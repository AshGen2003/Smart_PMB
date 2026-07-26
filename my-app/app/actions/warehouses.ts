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
