/**
 * Server Actions for the Warehouse Manager portal: recording a paddy
 * intake against one of the manager's own assigned warehouses.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type IntakeFormState = {
  error?: string;
  success?: boolean;
};

/**
 * Submits a single-step intake (farmer, paddy type, quantity, unit price)
 * against a chosen warehouse. See WarehouseIntakeView in the Django
 * backend for the server-side capacity validation and stock update.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain warehouseId, farmerId, paddyTypeId,
 *   quantityKg, unitPrice.
 * @returns `{ error }` if Django rejects the intake, otherwise `{ success: true }`.
 */
export async function submitWarehouseIntake(
  _prevState: IntakeFormState,
  formData: FormData
): Promise<IntakeFormState> {
  const res = await apiFetch("/api/warehouse-manager/intake/", {
    method: "POST",
    body: JSON.stringify({
      warehouse_id: Number(formData.get("warehouseId")),
      farmer_id: Number(formData.get("farmerId")),
      paddy_type_id: Number(formData.get("paddyTypeId")),
      quantity_kg: String(formData.get("quantityKg") ?? ""),
      unit_price: String(formData.get("unitPrice") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouse-manager");
  revalidatePath("/warehouse-manager/warehouses");
  return { success: true };
}
