/**
 * Server Actions for the mill owner self-service portal: applying for/
 * withdrawing license applications, submitting milling reports, and
 * editing the mill's own business details. Mirrors the shape of
 * app/actions/farmer.ts and app/actions/approvals.ts.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type MillFormState = {
  error?: string;
};

/**
 * Submits a new license application for the logged-in mill owner's mill.
 * No fields are required — applying just creates a pending row for the
 * caller's mill, which an officer then reviews.
 */
export async function applyForLicense(): Promise<{ error?: string }> {
  const res = await apiFetch("/api/mill-owner/licenses/", {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/licenses");
  revalidatePath("/mill-owner");
  return {};
}

/** Withdraws (deletes) a license application. Django only allows this while it's still "pending". */
export async function withdrawLicense(licenseId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/mill-owner/licenses/${licenseId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/licenses");
  revalidatePath("/mill-owner");
  return {};
}

/**
 * Submits a new milling report for the logged-in mill owner's mill.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `paddy_processed_kg` and `rice_output_kg`;
 *   `notes`/`paddy_type` are optional.
 */
export async function submitMillingReport(
  _prevState: MillFormState,
  formData: FormData
): Promise<MillFormState> {
  const res = await apiFetch("/api/mill-owner/milling-reports/", {
    method: "POST",
    body: JSON.stringify({
      paddy_processed_kg: String(formData.get("paddy_processed_kg") ?? ""),
      rice_output_kg: String(formData.get("rice_output_kg") ?? ""),
      notes: String(formData.get("notes") ?? "").trim(),
      paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/milling-reports");
  revalidatePath("/mill-owner");
  return {};
}

/**
 * Updates the logged-in mill owner's own mill business details (name,
 * business reg. no, location, district, capacity, contact number).
 */
export async function updateMillProfile(
  _prevState: MillFormState,
  formData: FormData
): Promise<MillFormState> {
  const res = await apiFetch("/api/mill-owner/profile/", {
    method: "PATCH",
    body: JSON.stringify({
      mill_name: String(formData.get("mill_name") ?? "").trim(),
      business_reg_no: String(formData.get("business_reg_no") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      district: formData.get("district") ? Number(formData.get("district")) : null,
      capacity_mt_per_day: formData.get("capacity_mt_per_day")
        ? String(formData.get("capacity_mt_per_day"))
        : null,
      contact_number: String(formData.get("contact_number") ?? "").trim(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/profile");
  revalidatePath("/mill-owner/settings");
  return {};
}
