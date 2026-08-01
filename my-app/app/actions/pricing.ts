/**
 * Server Actions for managing paddy types and their guaranteed purchase
 * prices — the pricing catalog admins configure (e.g. "Nadu", "Samba")
 * that harvest records (actions/approvals.ts) reference. All mutations
 * revalidate the "/pricing" page.
 */
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type PaddyTypeFormState = {
  error?: string;
};

// Maps a <form> submission to the JSON body Django's paddy-type endpoint
// expects. `guaranteed_price` is kept as a string (not Number()) since it's
// a decimal value best left to Django/DRF's DecimalField to parse exactly,
// avoiding floating-point rounding surprises.
function payloadFromFormData(formData: FormData) {
  return {
    type_name: String(formData.get("type_name") ?? "").trim(),
    variety: String(formData.get("variety") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    guaranteed_price: String(formData.get("guaranteed_price") ?? ""),
    is_active: formData.get("is_active") === "on",
  };
}

/**
 * Creates a new paddy type with its guaranteed price.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Paddy type fields — see payloadFromFormData.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/pricing".
 */
export async function createPaddyType(
  _prevState: PaddyTypeFormState,
  formData: FormData
): Promise<PaddyTypeFormState> {
  const res = await apiFetch("/api/admin/paddy-types/", {
    method: "POST",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/pricing");
  updateTag("paddy-types");
  return {};
}

/**
 * Updates an existing paddy type (e.g. revising its guaranteed price).
 *
 * @param paddyTypeId ID of the paddy type to update (bound ahead of the
 *   useActionState-managed args by the calling form).
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Updated paddy type fields.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/pricing".
 */
export async function updatePaddyType(
  paddyTypeId: number,
  _prevState: PaddyTypeFormState,
  formData: FormData
): Promise<PaddyTypeFormState> {
  const res = await apiFetch(`/api/admin/paddy-types/${paddyTypeId}/`, {
    method: "PATCH",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/pricing");
  updateTag("paddy-types");
  return {};
}

/** Permanently deletes a paddy type from the pricing catalog. */
export async function deletePaddyType(paddyTypeId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/paddy-types/${paddyTypeId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/pricing");
  updateTag("paddy-types");
  return {};
}
