"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type WarehouseFormState = {
  error?: string;
};

function payloadFromFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? ""),
    status: String(formData.get("status") ?? "active"),
    contact_number: String(formData.get("contact_number") ?? "").trim(),
    established_date: String(formData.get("established_date") ?? "") || null,
    location: String(formData.get("location") ?? "").trim(),
    district: formData.get("district") ? Number(formData.get("district")) : null,
  };
}

export async function createWarehouse(
  _prevState: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  const res = await apiFetch("/api/admin/warehouses/", {
    method: "POST",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  return {};
}

export async function updateWarehouse(
  warehouseId: number,
  _prevState: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/`, {
    method: "PATCH",
    body: JSON.stringify(payloadFromFormData(formData)),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  return {};
}

export async function deleteWarehouse(warehouseId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/warehouses/${warehouseId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/warehouses");
  return {};
}
