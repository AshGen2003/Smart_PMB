/**
 * Server Actions for the officer-facing warehouse transfer review queue:
 * approve/reject a warehouse manager's transfer request. Mirrors the shape
 * of app/actions/purchases.ts's rice-request review actions.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

async function transferRequestAction(requestId: number, action: "approve" | "reject", body?: object) {
  const res = await apiFetch(`/api/admin/warehouse-transfers/${requestId}/${action}/`, {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouse-transfers");
  return {};
}

/** Approves a pending warehouse transfer request, moving the stock atomically. */
export async function approveWarehouseTransfer(requestId: number): Promise<{ error?: string }> {
  return transferRequestAction(requestId, "approve");
}

/** Rejects a pending warehouse transfer request, with an optional review note. */
export async function rejectWarehouseTransfer(
  requestId: number,
  reviewNotes: string
): Promise<{ error?: string }> {
  return transferRequestAction(requestId, "reject", { review_notes: reviewNotes });
}
