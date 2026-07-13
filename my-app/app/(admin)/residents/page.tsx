import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import UsersManager, { type AdminUserRow } from "./UsersManager";
import type { RoleOption } from "./UserFormModal";

export default async function UsersPage() {
  const currentUser = await requirePermission("manage_users");

  const [usersRes, rolesRes] = await Promise.all([
    apiFetch("/api/admin/users/"),
    apiFetch("/api/admin/roles/"),
  ]);

  const users = usersRes.ok ? ((await usersRes.json()) as AdminUserRow[]) : [];
  const roles = rolesRes.ok ? ((await rolesRes.json()) as RoleOption[]) : [];

  return (
    <UsersManager users={users} roles={roles} currentUserId={currentUser.id} />
  );
}
