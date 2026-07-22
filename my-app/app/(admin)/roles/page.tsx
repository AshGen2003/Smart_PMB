/**
 * `/roles` — dynamic role & permission management (create/edit/delete
 * roles and assign permission codenames to them). Requires the
 * `manage_roles` permission.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import RolesManager, { type RoleRow } from "./RolesManager";
import type { PermissionOption } from "./RoleFormModal";

/** Server Component: gates access, fetches all roles and the master list of assignable permissions. */
export default async function RolesPage() {
  await requirePermission("manage_roles");

  const [rolesRes, permissionsRes] = await Promise.all([
    apiFetch("/api/admin/roles/"),
    apiFetch("/api/admin/permissions/"),
  ]);

  const roles = rolesRes.ok ? ((await rolesRes.json()) as RoleRow[]) : [];
  const permissions = permissionsRes.ok
    ? ((await permissionsRes.json()) as PermissionOption[])
    : [];

  return <RolesManager roles={roles} permissions={permissions} />;
}
