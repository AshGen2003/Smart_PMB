"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type PaddyTypeFormState = {
  error?: string;
};

function payloadFromFormData(formData: FormData) {
  return {
    type_name: String(formData.get("type_name") ?? "").trim(),
    variety: String(formData.get("variety") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    guaranteed_price: String(formData.get("guaranteed_price") ?? ""),
    is_active: formData.get("is_active") === "on",
  };
}

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
  return {};
}

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
  return {};
}

export async function deletePaddyType(paddyTypeId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/paddy-types/${paddyTypeId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/pricing");
  return {};
}
