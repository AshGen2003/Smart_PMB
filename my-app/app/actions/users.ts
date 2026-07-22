/**
 * Server Actions for admin management of staff/officer user accounts
 * (creating, editing, deleting, unlocking, and force-logging-out users).
 * This is distinct from actions/profile.ts, which lets a user edit their
 * own account — these actions act on other users and therefore require
 * the caller to hold the relevant admin permission (enforced by the
 * "/residents" page via lib/dal.ts before these are ever reachable).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type UserFormState = {
  error?: string;
};

/**
 * Creates a new staff/officer user account with a role assignment.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData User fields: email, password, fullName, role (role ID).
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/residents" (the user list page).
 */
export async function createUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const payload = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    full_name: String(formData.get("fullName") ?? "").trim(),
    role: Number(formData.get("role")),
  };

  const res = await apiFetch("/api/admin/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/residents");
  return {};
}

/**
 * Updates an existing user's profile fields, role, active status, and
 * optionally their password.
 *
 * @param userId ID of the user to update (bound ahead of the
 *   useActionState-managed args by the calling form).
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Updated user fields: email, fullName, role, isActive,
 *   and an optional password.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/residents".
 */
export async function updateUser(
  userId: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const password = String(formData.get("password") ?? "");
  const payload: Record<string, unknown> = {
    email: String(formData.get("email") ?? "").trim(),
    full_name: String(formData.get("fullName") ?? "").trim(),
    role: Number(formData.get("role")),
    is_active: formData.get("isActive") === "on",
  };
  // Only include password in the payload if the admin actually typed a new
  // one — an empty field means "leave the existing password unchanged",
  // and sending an empty string would otherwise wipe/reject it.
  if (password) payload.password = password;

  const res = await apiFetch(`/api/admin/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/residents");
  return {};
}

/** Permanently deletes a user account. */
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/users/${userId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/residents");
  return {};
}

/**
 * Unlocks a user account that Django has locked out (e.g. after too many
 * failed login attempts), letting them log in again.
 */
export async function unlockUser(userId: string): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/users/${userId}/unlock/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/residents");
  return {};
}

/**
 * Forces another user's active session(s) to end server-side (e.g.
 * invalidating their refresh token), for admin security actions like
 * responding to a compromised account. Note this doesn't call
 * `revalidatePath` — it doesn't change any data the "/residents" list
 * displays, only the target user's session state.
 */
export async function forceLogoutUser(userId: string): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/users/${userId}/force-logout/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  return {};
}
