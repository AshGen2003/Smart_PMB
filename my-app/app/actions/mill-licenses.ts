/**
 * Server Actions for the officer/admin mill-license review queue (see
 * (admin)/mill-licenses/). Distinct from actions/licenses.ts, which governs
 * the LicenseApplication account-approval gate (should this business be let
 * onto the platform at all) — this instead governs a Mill's ongoing,
 * renewable operating License (mills/models.py), reviewed after the account
 * already has access. Named separately from actions/licenses.ts to avoid a
 * function-name collision (both queues have an "approve"/"reject" action).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

/** Approves a pending mill license application, assigning a license number and one-year validity window. */
export async function approveMillLicense(licenseId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/mill-licenses/${licenseId}/approve/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/licenses");
  return {};
}

/** Rejects a pending mill license application, with an optional review note. */
export async function rejectMillLicense(
  licenseId: number,
  reviewNotes: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/mill-licenses/${licenseId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ review_notes: reviewNotes }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/licenses");
  return {};
}

/** Suspends a currently-approved mill license. `reason` is required. */
export async function suspendMillLicense(
  licenseId: number,
  reason: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/mill-licenses/${licenseId}/suspend/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-licenses");
  return {};
}

/** Revokes a mill license (from approved or suspended). `reason` is required. */
export async function revokeMillLicense(
  licenseId: number,
  reason: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/mill-licenses/${licenseId}/revoke/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-licenses");
  return {};
}
