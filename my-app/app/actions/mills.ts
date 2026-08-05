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
 * Submits a new license application for the logged-in mill owner's mill —
 * a brand new one, or a renewal of an already-approved license (pass its
 * id as the `renewed_from` field). Requires the full set of details an
 * officer reviews before issuing a license: requested capacity, milling
 * type, premises address, and business justification.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `milling_type`, `premises_address`, and
 *   `justification`; `requested_capacity_mt_per_day`/`contact_number`/
 *   `renewed_from` are optional.
 */
export async function applyForLicense(
  _prevState: MillFormState,
  formData: FormData
): Promise<MillFormState> {
  const res = await apiFetch("/api/mill-owner/licenses/", {
    method: "POST",
    body: JSON.stringify({
      renewed_from: formData.get("renewed_from") ? Number(formData.get("renewed_from")) : null,
      requested_capacity_mt_per_day: String(formData.get("requested_capacity_mt_per_day") ?? "") || null,
      milling_type: String(formData.get("milling_type") ?? ""),
      premises_address: String(formData.get("premises_address") ?? "").trim(),
      justification: String(formData.get("justification") ?? "").trim(),
      contact_number: String(formData.get("contact_number") ?? "").trim(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/licenses");
  revalidatePath("/partner");
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

  revalidatePath("/partner/licenses");
  revalidatePath("/partner");
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
      husk_kg: String(formData.get("husk_kg") ?? "") || null,
      bran_kg: String(formData.get("bran_kg") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim(),
      paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/partner/milling-reports");
  revalidatePath("/partner");
  return {};
}

/**
 * Submits a new raw-paddy allocation request for the logged-in mill
 * owner's mill: a specific paddy type and quantity to be allocated from a
 * PMB warehouse, for a PMB officer to approve and fulfill.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `paddy_type` and `quantity_kg`.
 */
export async function requestMillingAllocation(
  _prevState: MillFormState,
  formData: FormData
): Promise<MillFormState> {
  const res = await apiFetch("/api/mill-owner/milling-allocations/", {
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

  revalidatePath("/mill-owner/milling-allocations");
  return {};
}

/** Withdraws (deletes) a milling allocation request. Django only allows this while it's still "pending". */
export async function withdrawMillingAllocation(allocationId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/mill-owner/milling-allocations/${allocationId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/milling-allocations");
  return {};
}

/**
 * Submits a request to transport milled rice from a fulfilled allocation
 * back to a PMB warehouse.
 *
 * @param allocationId The fulfilled MillingAllocation this return accounts for.
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain `destination_warehouse` and `rice_kg`.
 */
export async function requestMillingReturn(
  allocationId: number,
  _prevState: MillFormState,
  formData: FormData
): Promise<MillFormState> {
  const res = await apiFetch("/api/mill-owner/milling-returns/", {
    method: "POST",
    body: JSON.stringify({
      allocation: allocationId,
      destination_warehouse: Number(formData.get("destination_warehouse")),
      rice_kg: String(formData.get("rice_kg") ?? ""),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/milling-allocations");
  return {};
}

/** Withdraws (deletes) a milling return request. Django only allows this while it's still "pending". */
export async function withdrawMillingReturn(returnId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/mill-owner/milling-returns/${returnId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-owner/milling-allocations");
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

  revalidatePath("/partner/profile");
  revalidatePath("/partner/settings");
  return {};
}
