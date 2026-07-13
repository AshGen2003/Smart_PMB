import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import RolesManager, { type RoleRow } from "./RolesManager";
import type { PermissionOption } from "./RoleFormModal";

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
