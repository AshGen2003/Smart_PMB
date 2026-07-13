"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type HarvestFormState = {
  error?: string;
};

function payloadFromFormData(formData: FormData) {
  const payload: Record<string, unknown> = {
    farmer: Number(formData.get("farmer")),
    paddy_type: formData.get("paddy_type") ? Number(formData.get("paddy_type")) : null,
    warehouse: formData.get("warehouse") ? Number(formData.get("warehouse")) : null,
    quantity_kg: String(formData.get("quantity_kg") ?? ""),
    purchase_date: String(formData.get("purchase_date") ?? "") || null,
    grade: String(formData.get("grade") ?? "") || null,
    moisture_level: String(formData.get("moisture_level") ?? "") || null,
    unit_price: String(formData.get("unit_price") ?? "") || null,
  };
  const qualityCheck = formData.get("quality_check");
  payload.quality_check = qualityCheck === null ? null : qualityCheck === "on";
  return payload;
}

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

export async function approveHarvest(harvestId: number): Promise<{ error?: string }> {
  return harvestAction(harvestId, "approve");
}

export async function rejectHarvest(harvestId: number): Promise<{ error?: string }> {
  return harvestAction(harvestId, "reject");
}

export async function collectHarvest(harvestId: number): Promise<{ error?: string }> {
  return harvestAction(harvestId, "collect");
}

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
