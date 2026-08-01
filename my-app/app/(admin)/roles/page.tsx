/**
 * `/roles` — dynamic role & permission management (create/edit/delete
 * roles and assign permission codenames to them). Requires the
 * `manage_roles` permission.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetchCached } from "@/app/lib/api";
import RolesManager, { type RoleRow } from "./RolesManager";
import type { PermissionOption } from "./RoleFormModal";

/** Server Component: gates access, fetches all roles and the master list of assignable permissions. */
export default async function RolesPage() {
  await requirePermission("manage_roles");

  // Roles/permissions are reused as reference data on /residents too — see
  // apiFetchCached's docstring. revalidateTag("roles") in actions/roles.ts
  // keeps this fresh the moment a role is created/edited/deleted; permission
  // codenames have no create/edit UI at all (fixed at the model level), so a
  // longer window with no invalidation trigger is fine.
  const [rolesRes, permissionsRes] = await Promise.all([
    apiFetchCached("/api/admin/roles/", 300, ["roles"]),
    apiFetchCached("/api/admin/permissions/", 3600, ["permissions"]),
  ]);

  const roles = rolesRes.ok ? ((await rolesRes.json()) as RoleRow[]) : [];
  const permissions = permissionsRes.ok
    ? ((await permissionsRes.json()) as PermissionOption[])
    : [];

  return <RolesManager roles={roles} permissions={permissions} />;
}
