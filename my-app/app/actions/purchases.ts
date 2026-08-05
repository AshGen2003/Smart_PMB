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

export type FarmerLookupResult = {
  id: number;
  name: string;
  registration_no: string;
  reliability_score: number;
  quota: {
    max_quota_kg: number | null;
    quota_used_kg: number;
    quota_remaining_kg: number | null;
  };
};

/** Looks up a farmer by exact NIC match for the farm-gate buying terminal (purchases.views.FarmerNicLookupView). */
export async function lookupFarmerByNic(nic: string): Promise<{ farmer?: FarmerLookupResult; error?: string }> {
  const res = await apiFetch(`/api/purchaser/nic-lookup/?nic=${encodeURIComponent(nic)}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "No farmer found with that NIC.") };
  }

  return { farmer: await res.json() };
}

/**
 * Records a direct at-source purchase from a farmer already looked up via
 * lookupFarmerByNic. `farmerId` is bound in by the caller (not part of the
 * form) so the recorded purchase always matches the farmer shown on screen.
 */
export async function submitFarmGatePurchase(
  farmerId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const res = await apiFetch("/api/purchaser/farm-gate-purchases/", {
    method: "POST",
    body: JSON.stringify({
      farmer: farmerId,
      paddy_type: Number(formData.get("paddy_type")),
      weight_kg: String(formData.get("weight_kg") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/farm-gate-purchases");
  revalidatePath("/partner");
  return {};
}

/**
 * Creates a dispatch manifest bundling the given (already-selected,
 * still-unassigned) farm-gate purchases for transfer to a warehouse.
 */
export async function createDispatchManifest(
  purchaseIds: number[],
  formData: FormData
): Promise<{ error?: string }> {
  const res = await apiFetch("/api/purchaser/dispatch-manifests/", {
    method: "POST",
    body: JSON.stringify({
      destination_warehouse: Number(formData.get("destination_warehouse")),
      purchase_ids: purchaseIds,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/farm-gate-purchases");
  revalidatePath("/partner");
  return {};
}

/** Withdraws a dispatch manifest. Django only allows this while it's still "pending". */
export async function withdrawDispatchManifest(manifestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/purchaser/dispatch-manifests/${manifestId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/farm-gate-purchases");
  revalidatePath("/partner");
  return {};
}
