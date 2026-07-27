/**
 * Server Actions backing the officer-side mill license review queue:
 * approving or rejecting a pending application. Mirrors the shared
 * implementation pattern in app/actions/approvals.ts (harvestAction).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

async function licenseAction(licenseId: number, action: "approve" | "reject", body?: object) {
  const res = await apiFetch(`/api/admin/mill-licenses/${licenseId}/${action}/`, {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/licenses");
  return {};
}

/** Approves a pending mill license application. */
export async function approveLicense(licenseId: number): Promise<{ error?: string }> {
  return licenseAction(licenseId, "approve");
}

/** Rejects a pending mill license application, with an optional review note. */
export async function rejectLicense(licenseId: number, reviewNotes: string): Promise<{ error?: string }> {
  return licenseAction(licenseId, "reject", { review_notes: reviewNotes });
}
