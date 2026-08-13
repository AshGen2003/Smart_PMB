/**
 * Server Action for the officer-side purchaser-limits editor: setting an
 * Authorized Purchaser's buying weight limit and government advance.
 * Mirrors the shape of app/actions/purchases.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type PurchaserLimitsFormState = {
  error?: string;
};

/**
 * Updates an Authorized Purchaser's officer-assigned buying weight limit
 * and government advance.
 *
 * @param purchaserId ID of the AuthorizedPurchaser record to update.
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData May contain `weight_limit_kg`/`advance_amount`.
 */
export async function updatePurchaserLimits(
  purchaserId: number,
  _prevState: PurchaserLimitsFormState,
  formData: FormData
): Promise<PurchaserLimitsFormState> {
  const res = await apiFetch(`/api/admin/authorized-purchasers/${purchaserId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      weight_limit_kg: String(formData.get("weight_limit_kg") ?? "") || null,
      advance_amount: String(formData.get("advance_amount") ?? "") || null,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/purchase-requests");
  return {};
}
