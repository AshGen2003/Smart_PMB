/**
 * Server Actions for the officer/admin licensing-application review queue
 * (see (admin)/licenses/). Approving/rejecting an authorized-purchaser or
 * mill-owner application is what flips their account from the pending
 * holding screen (see mill-owner/layout.tsx, purchaser/layout.tsx) to real
 * access — see accounts/views.py's LicenseApplicationViewSet.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

/** Approves a pending licensing application, granting the applicant real access. */
export async function approveLicense(applicationId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/license-applications/${applicationId}/approve/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/licenses");
  return {};
}

/**
 * Rejects a pending licensing application. `reason` is shown to the
 * applicant on their holding screen and in their decision email, so it
 * should explain what to fix or why — an empty reason is allowed but not
 * very useful to them.
 */
export async function rejectLicense(
  applicationId: number,
  reason: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/license-applications/${applicationId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/licenses");
  return {};
}

/**
 * Uploads (or replaces) the logged-in applicant's own supporting business
 * document while their LicenseApplication is still pending review. Called
 * from components/PendingLicenseScreen.tsx's holding screen, shared by both
 * the mill-owner and purchaser portals.
 */
export async function uploadLicenseApplicationDocument(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const document = formData.get("document");
  if (!(document instanceof File) || document.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const body = new FormData();
  body.set("document", document);

  const res = await apiFetch("/api/auth/license-application/document/", {
    method: "PATCH",
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner");
  revalidatePath("/purchaser");
  return {};
}
