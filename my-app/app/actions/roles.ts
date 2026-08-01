/**
 * Server Actions for managing dynamic roles and their attached permission
 * sets. Roles are what get assigned to users (actions/users.ts) and are
 * what lib/dal.ts's `requirePermission`/`requireRole` checks against — so
 * editing a role's permissions here changes what its holders can access
 * app-wide (after their JWT is refreshed with the updated claims).
 */
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type RoleFormState = {
  error?: string;
};

// A role form submits its selected permissions as a set of same-named
// checkbox inputs; FormData.getAll() collects every "permissions" value
// into an array of the checked codenames.
function permissionsFromFormData(formData: FormData): string[] {
  return formData.getAll("permissions").map(String);
}

/**
 * Creates a new role with a name, description, and set of permissions.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Role fields: name, description, and one or more
 *   "permissions" checkbox values.
 * @returns `{ error }` on failure. On success, revalidates both "/roles"
 *   (the role list) and "/residents" (the user list, since it displays
 *   each user's role) and returns `{}`.
 */
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
  updateTag("roles");
  return {};
}

/**
 * Updates an existing role's name, description, and/or permission set.
 *
 * @param roleId ID of the role to update (bound ahead of the
 *   useActionState-managed args by the calling form).
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Updated role fields.
 * @returns `{ error }` on failure, otherwise `{}` after revalidating
 *   "/roles" and "/residents".
 */
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
  updateTag("roles");
  return {};
}

/**
 * Permanently deletes a role. Django is expected to reject this (via the
 * error response surfaced through `firstErrorMessage`) if any user is still
 * assigned to the role, rather than this action checking that beforehand.
 */
export async function deleteRole(roleId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/admin/roles/${roleId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/roles");
  updateTag("roles");
  return {};
}

/**
 * Toggles a single permission codename on/off for a role — used by the
 * Preview Portal's clickable nav checklist so an admin can grant/revoke
 * access to one specific sidebar button without opening the full role-edit
 * form. `currentPermissions` is the role's full codename list as already
 * known by the caller (from the page's own data fetch), so this doesn't
 * need a separate read before writing.
 */
export async function toggleRolePermission(
  roleId: number,
  codename: string,
  currentPermissions: string[],
  enabled: boolean
): Promise<{ error?: string }> {
  const nextPermissions = enabled
    ? Array.from(new Set([...currentPermissions, codename]))
    : currentPermissions.filter((p) => p !== codename);

  const res = await apiFetch(`/api/admin/roles/${roleId}/`, {
    method: "PATCH",
    body: JSON.stringify({ permissions: nextPermissions }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/preview");
  revalidatePath("/roles");
  revalidatePath("/residents");
  updateTag("roles");
  return {};
}
