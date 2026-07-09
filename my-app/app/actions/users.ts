"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";

export type UserFormState = {
  error?: string;
};

function firstErrorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const firstValue = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
    if (typeof firstValue === "string") return firstValue;
  }
  return "Something went wrong. Please try again.";
}

export async function createUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const payload = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    full_name: String(formData.get("fullName") ?? "").trim(),
    role: String(formData.get("role") ?? ""),
  };

  const res = await apiFetch("/api/admin/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/users");
  return {};
}

export async function updateUser(
  userId: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const password = String(formData.get("password") ?? "");
  const payload: Record<string, unknown> = {
    email: String(formData.get("email") ?? "").trim(),
    full_name: String(formData.get("fullName") ?? "").trim(),
    role: String(formData.get("role") ?? ""),
    is_active: formData.get("isActive") === "on",
  };
  if (password) payload.password = password;

  const res = await apiFetch(`/api/admin/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/users");
  return {};
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/users/${userId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/users");
  return {};
}
