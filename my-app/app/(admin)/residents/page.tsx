/**
 * `/residents` — user account management (despite the route name, this
 * lists all platform accounts, not just farmers/residents). Requires the
 * `manage_users` permission.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch, apiFetchCached } from "@/app/lib/api";
import UsersManager, { type AdminUserRow } from "./UsersManager";
import type { RoleOption } from "./UserFormModal";

/**
 * Server Component: gates access, fetches the user list and the available
 * roles (for the filter dropdown and the create/edit form), and passes
 * along whether the current user also has manage_system (needed to
 * unlock/force-logout other accounts).
 */
export default async function UsersPage() {
  const currentUser = await requirePermission("manage_users");

  // Users are per-account data that changes via this very page (create/
  // edit/delete/unlock/force-logout) — always fetched fresh. Roles is just
  // reference data for the filter dropdown and the create/edit form, shared
  // with /roles's own listing — see apiFetchCached's docstring.
  const [usersRes, rolesRes] = await Promise.all([
    apiFetch("/api/admin/users/"),
    apiFetchCached("/api/admin/roles/", 300, ["roles"]),
  ]);

  const users = usersRes.ok ? ((await usersRes.json()) as AdminUserRow[]) : [];
  const roles = rolesRes.ok ? ((await rolesRes.json()) as RoleOption[]) : [];

  return (
    <UsersManager
      users={users}
      roles={roles}
      currentUserId={currentUser.id}
      canManageSystem={currentUser.permissions.includes("manage_system")}
    />
  );
}
