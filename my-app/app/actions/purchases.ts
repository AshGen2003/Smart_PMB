/**
 * Server Actions for the rice request workflow: the Authorized Purchaser
 * self-service side (submit/withdraw) and the PMB officer review side
 * (approve/reject/fulfill). Mirrors the shape of app/actions/mills.ts and
 * app/actions/licenses.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type PurchaseRequestFormState = {
  error?: string;
};

/**
 * Submits a new rice request for the logged-in Authorized Purchaser.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `paddy_type` and `quantity_kg`.
 */
export async function submitRiceRequest(
  _prevState: PurchaseRequestFormState,
  formData: FormData
): Promise<PurchaseRequestFormState> {
  const res = await apiFetch("/api/purchaser/requests/", {
    method: "POST",
    body: JSON.stringify({
      paddy_type: Number(formData.get("paddy_type")),
      quantity_kg: String(formData.get("quantity_kg") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/rice-requests");
  revalidatePath("/partner");
  return {};
}

/** Withdraws (deletes) a rice request. Django only allows this while it's still "pending". */
export async function withdrawRiceRequest(requestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/purchaser/requests/${requestId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/rice-requests");
  revalidatePath("/partner");
  return {};
}

async function riceRequestAction(
  requestId: number,
  action: "approve" | "reject" | "fulfill" | "verify_transaction",
  body?: object
) {
  const res = await apiFetch(`/api/admin/rice-requests/${requestId}/${action}/`, {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/purchase-requests");
  return {};
}

/** Approves a pending rice request, allowing it to then be fulfilled from a warehouse. */
export async function approveRiceRequest(requestId: number): Promise<{ error?: string }> {
  return riceRequestAction(requestId, "approve");
}

/** Rejects a pending rice request, with an optional review note. */
export async function rejectRiceRequest(requestId: number, reviewNotes: string): Promise<{ error?: string }> {
  return riceRequestAction(requestId, "reject", { review_notes: reviewNotes });
}

/** Fulfills an approved rice request by releasing its quantity from the given warehouse. */
export async function fulfillRiceRequest(requestId: number, warehouseId: number): Promise<{ error?: string }> {
  return riceRequestAction(requestId, "fulfill", { warehouse: warehouseId });
}

/**
 * Records an after-the-fact accountability sign-off on a fulfilled rice
 * request — an additional check, not a new gate (see
 * farmers.models.TransactionVerification's docstring on the backend).
 */
export async function verifyRiceRequestTransaction(requestId: number): Promise<{ error?: string }> {
  return riceRequestAction(requestId, "verify_transaction", { status: "verified" });
}
