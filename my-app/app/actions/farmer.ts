/**
 * Server Actions for the farmer self-service portal: notification handling
 * and the farmer's own harvest submissions (as opposed to admin/officer-side
 * actions in the other files under app/actions/).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type HarvestFormState = {
  error?: string;
};

export type BankDetailsFormState = {
  error?: string;
};

export type DeliverySlotFormState = {
  error?: string;
};

/**
 * Marks a single notification as read for the current farmer.
 *
 * Ignores the response status rather than returning a FormState/error —
 * this is meant to be a low-stakes, fire-and-forget UI action (e.g.
 * triggered by opening a notification), so a failure here doesn't need to
 * interrupt the user with an error message.
 *
 * @param notificationId ID of the notification to mark as read.
 */
export async function markNotificationRead(notificationId: number) {
  await apiFetch(`/api/notifications/${notificationId}/read/`, {
    method: "POST",
  });
  // Refresh the farmer portal so the notification's read/unread state
  // (and any unread-count badge) reflects the change.
  revalidatePath("/farmer");
}

/**
 * Submits a new harvest delivery for the logged-in farmer. Only paddy type
 * and quantity are farmer-writable — grade/price/warehouse are filled in
 * later by an officer during approval.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `paddy_type` and `quantity_kg`.
 * @returns `{ error }` if Django rejects the submission, otherwise `{}`
 *   after revalidating "/farmer/harvests".
 */
export async function submitHarvest(
  _prevState: HarvestFormState,
  formData: FormData
): Promise<HarvestFormState> {
  const res = await apiFetch("/api/farmer/harvests/", {
    method: "POST",
    body: JSON.stringify({
      paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
      quantity_kg: String(formData.get("quantity_kg") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/farmer/harvests");
  return {};
}

/**
 * Withdraws (deletes) one of the farmer's own harvests. Django only allows
 * this while the harvest is still "pending".
 *
 * @param harvestId ID of the harvest to withdraw.
 */
export async function withdrawHarvest(harvestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/farmer/harvests/${harvestId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/farmer/harvests");
  return {};
}

/**
 * Books a new advance delivery slot for the logged-in farmer at a chosen
 * warehouse. paddy_type is optional (a farmer may not know the exact type
 * yet when booking ahead); booking_reference/farmer/status are set
 * server-side (see farmers.views.FarmerDeliverySlotViewSet.perform_create).
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `warehouse` and `scheduled_date`; may
 *   contain `paddy_type` and `estimated_quantity_kg`.
 */
export async function submitDeliverySlot(
  _prevState: DeliverySlotFormState,
  formData: FormData
): Promise<DeliverySlotFormState> {
  const res = await apiFetch("/api/farmer/delivery-slots/", {
    method: "POST",
    body: JSON.stringify({
      warehouse: Number(formData.get("warehouse")),
      paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
      estimated_quantity_kg: String(formData.get("estimated_quantity_kg") ?? ""),
      scheduled_date: String(formData.get("scheduled_date") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/farmer/delivery-slots");
  return {};
}

/** Cancels a delivery slot booking. Django only allows this while it's still "booked". */
export async function cancelDeliverySlot(slotId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/farmer/delivery-slots/${slotId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/farmer/delivery-slots");
  return {};
}

/**
 * Updates the logged-in farmer's own payout bank details.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData May contain `bank_account`/`bank_name`.
 */
export async function updateBankDetails(
  _prevState: BankDetailsFormState,
  formData: FormData
): Promise<BankDetailsFormState> {
  const res = await apiFetch("/api/farmer/bank-details/", {
    method: "PATCH",
    body: JSON.stringify({
      bank_account: String(formData.get("bank_account") ?? "").trim(),
      bank_name: String(formData.get("bank_name") ?? "").trim(),
      bank_branch: String(formData.get("bank_branch") ?? "").trim(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/farmer/settings");
  revalidatePath("/farmer/profile");
  return {};
}
