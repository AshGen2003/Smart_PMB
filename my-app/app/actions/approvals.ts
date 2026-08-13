/**
 * Server Actions backing the harvest approvals workflow: creating/editing
 * harvest records and approving, rejecting, collecting, or deleting them.
 * Officers/admins record a farmer's paddy delivery, then move it through
 * the approve/collect pipeline before payment. Every mutation revalidates
 * the "/approvals" page so its Server Component re-fetches fresh data on
 * the next visit instead of showing a stale list.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

// Result shape returned to the calling form: empty object = success,
// `{ error }` = show this message to the user.
export type HarvestFormState = {
  error?: string;
};

// Maps a raw <form> submission into the JSON body Django's harvest endpoint
// expects. Numeric FK fields (farmer/paddy_type/warehouse) are coerced from
// the string values form inputs always produce, and optional fields fall
// back to null rather than an empty string so Django's serializer treats
// them as "not provided" instead of an invalid empty value.
function payloadFromFormData(formData: FormData) {
  const payload: Record<string, unknown> = {
    farmer: Number(formData.get("farmer")),
    paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
    warehouse: formData.get("warehouse") ? Number(formData.get("warehouse")) : null,
    quantity_kg: String(formData.get("quantity_kg") ?? ""),
    purchase_date: String(formData.get("purchase_date") ?? "") || null,
    grade: String(formData.get("grade") ?? "") || null,
    moisture_level: String(formData.get("moisture_level") ?? "") || null,
    impurity_percent: String(formData.get("impurity_percent") ?? "") || null,
    empty_grains_percent: String(formData.get("empty_grains_percent") ?? "") || null,
    unit_price: String(formData.get("unit_price") ?? "") || null,
  };
  const qualityCheck = formData.get("quality_check");
  // A checkbox field is only present in FormData when checked, so a missing
  // key means "untouched" (null) rather than "explicitly unchecked" (false).
  payload.quality_check = qualityCheck === null ? null : qualityCheck === "on";
  return payload;
}

/**
 * Creates a new harvest (paddy delivery) record.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Harvest fields — see payloadFromFormData for the mapping.
 * @returns `{ error }` if Django rejects the submission, otherwise `{}`
 *   after revalidating "/approvals" so the list picks up the new record.
 */
export async function createHarvest(
  _prevState: HarvestFormState,
  formData: FormData
): Promise<HarvestFormState> {
  const res = await apiFetch("/api/admin/harvests/", {
    method: "POST",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/approvals");
  return {};
}

/**
 * Updates an existing harvest record (e.g. correcting quantity or grade
 * before it's approved).
 *
 * @param harvestId ID of the harvest to update. Note this is bound ahead of
 *   the useActionState-managed args (typically via `.bind(null, harvestId)`
 *   on the calling form), so the parameter order here is
 *   (harvestId, prevState, formData) rather than the usual two-arg action
 *   signature.
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Updated harvest fields.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/approvals".
 */
export async function updateHarvest(
  harvestId: number,
  _prevState: HarvestFormState,
  formData: FormData
): Promise<HarvestFormState> {
  const res = await apiFetch(`/api/admin/harvests/${harvestId}/`, {
    method: "PATCH",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/approvals");
  return {};
}

// Shared implementation for the three harvest status-transition endpoints
// (approve/reject/collect) — they're identical apart from which URL segment
// they hit, so the exported wrappers below just pick the action name.
async function harvestAction(harvestId: number, action: "approve" | "reject" | "collect") {
  const res = await apiFetch(`/api/admin/harvests/${harvestId}/${action}/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/approvals");
  return {};
}

/** Marks a pending harvest as approved (moves it toward payment/collection). */
export async function approveHarvest(harvestId: number): Promise<{ error?: string }> {
  return harvestAction(harvestId, "approve");
}

/** Marks a pending harvest as rejected. */
export async function rejectHarvest(harvestId: number): Promise<{ error?: string }> {
  return harvestAction(harvestId, "reject");
}

/** Marks an approved harvest as physically collected from the farmer. */
export async function collectHarvest(harvestId: number): Promise<{ error?: string }> {
  return harvestAction(harvestId, "collect");
}

/**
 * Records an after-the-fact accountability sign-off on a collected
 * harvest — an additional check, not a new gate (see
 * farmers.models.TransactionVerification's docstring on the backend).
 */
export async function verifyHarvestTransaction(harvestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/harvests/${harvestId}/verify_transaction/`, {
    method: "POST",
    body: JSON.stringify({ status: "verified" }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/approvals");
  return {};
}

/** Permanently deletes a harvest record. */
export async function deleteHarvest(harvestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/harvests/${harvestId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/approvals");
  return {};
}
