"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type RoleFormState = {
  error?: string;
};

function permissionsFromFormData(formData: FormData): string[] {
  return formData.getAll("permissions").map(String);
}

export async function createRole(
  _prevState: RoleFormState,
  formData: FormData
): Promise<RoleFormState> {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    permissions: permissionsFromFormData(formData),
  };

  const res = await apiFetch("/api/admin/roles/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/roles");
  revalidatePath("/residents");
  return {};
}

export async function updateRole(
  roleId: number,
  _prevState: RoleFormState,
  formData: FormData
): Promise<RoleFormState> {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    permissions: permissionsFromFormData(formData),
  };

  const res = await apiFetch(`/api/admin/roles/${roleId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/roles");
  revalidatePath("/residents");
  return {};
}

export async function deleteRole(roleId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/roles/${roleId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/roles");
  return {};
}
