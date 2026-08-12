/**
 * Server Actions for admin management of staff/officer user accounts
 * (creating, editing, deleting, unlocking, and force-logging-out users).
 * This is distinct from actions/profile.ts, which lets a user edit their
 * own account — these actions act on other users and therefore require
 * the caller to hold the relevant admin permission (enforced by the
 * "/users" page via lib/dal.ts before these are ever reachable).
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
 *   "/users" (the user list page).
 */
export async function createUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const payload = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    full_name: String(formData.get("fullName") ?? "").trim(),
    nic: String(formData.get("nic") ?? "").trim(),
    phone_number: String(formData.get("phoneNumber") ?? "").trim(),
    role: Number(formData.get("role")),
    // designation is pmb_officer-only, land_size is farmer-only; district
    // is shared by both — Django ignores whichever doesn't apply to the
    // selected role (see accounts/serializers.py's AdminUserWriteSerializer.create).
    designation: String(formData.get("designation") ?? "").trim(),
    district: formData.get("district") ? Number(formData.get("district")) : null,
    land_size: formData.get("landSize") ? Number(formData.get("landSize")) : null,
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

/**
 * Updates an existing user's profile fields, role, and active status.
 * Password is never part of this — editing a user can't set their
 * password anymore; see resetUserPassword below for the dedicated action.
 *
 * @param userId ID of the user to update (bound ahead of the
 *   useActionState-managed args by the calling form).
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Updated user fields: email, fullName, role, isActive.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/users".
 */
export async function updateUser(
  userId: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const payload: Record<string, unknown> = {
    email: String(formData.get("email") ?? "").trim(),
    full_name: String(formData.get("fullName") ?? "").trim(),
    nic: String(formData.get("nic") ?? "").trim(),
    phone_number: String(formData.get("phoneNumber") ?? "").trim(),
    role: Number(formData.get("role")),
    is_active: formData.get("isActive") === "on",
    email_confirmed: formData.get("emailConfirmed") === "on",
    designation: String(formData.get("designation") ?? "").trim(),
    district: formData.get("district") ? Number(formData.get("district")) : null,
    land_size: formData.get("landSize") ? Number(formData.get("landSize")) : null,
  };

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

/** Permanently deletes a user account. */
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

  revalidatePath("/users");
  return {};
}

/**
 * Resets a user's password: generates a fresh system temporary password
 * server-side, emails it to them, and forces a change on next login. This
 * is the only way an admin can affect another user's password now — the
 * edit form no longer has a password field at all.
 */
export async function resetUserPassword(userId: string): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/users/${userId}/reset-password/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  return {};
}

/**
 * Forces another user's active session(s) to end server-side (e.g.
 * invalidating their refresh token), for admin security actions like
 * responding to a compromised account. Note this doesn't call
 * `revalidatePath` — it doesn't change any data the "/users" list
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
