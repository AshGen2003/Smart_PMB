/**
 * `/users` — user account management (lists all platform accounts —
 * farmers, drivers, warehouse managers, officers, everyone — not a
 * farmer-only "residents" list). Requires
 * `manage_users` (full access) or any of the narrower per-role
 * permissions (manage_farmers, manage_drivers, manage_warehouse_managers,
 * manage_mill_owners, manage_purchasers) — matching AdminUserViewSet's
 * own HasAnyPermission gate, so someone granted only e.g. manage_farmers
 * can still reach this page at all, just seeing a scoped-down list.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch, apiFetchCached } from "@/app/lib/api";
import UsersManager, { type AdminUserRow } from "./UsersManager";
import type { DistrictOption, RoleOption } from "./UserFormModal";

/**
 * Server Component: gates access, fetches the user list, the available
 * roles (for the filter dropdown and the create/edit form), and the
 * district list (for the create/edit form's PMB-officer-only district
 * picker), and passes along whether the current user also has
 * manage_system (needed to unlock/force-logout other accounts).
 */
export default async function UsersPage() {
  const currentUser = await requireAnyPermission(
    "manage_users",
    "manage_farmers",
    "manage_drivers",
    "manage_warehouse_managers",
    "manage_mill_owners",
    "manage_purchasers"
  );

  // Users are per-account data that changes via this very page (create/
  // edit/delete/unlock/force-logout) — always fetched fresh. Roles/districts
  // are just reference data shared with other pages — see
  // apiFetchCached's docstring.
  const [usersRes, rolesRes, districtsRes] = await Promise.all([
    apiFetch("/api/admin/users/"),
    apiFetchCached("/api/admin/roles/", 300, ["roles"]),
    apiFetchCached("/api/districts/", 3600, ["districts"]),
  ]);

  const users = usersRes.ok ? ((await usersRes.json()) as AdminUserRow[]) : [];
  let roles = rolesRes.ok ? ((await rolesRes.json()) as RoleOption[]) : [];
  const districts = districtsRes.ok ? ((await districtsRes.json()) as DistrictOption[]) : [];

  // A non-admin manager (e.g. a PMB Officer holding manage_users) never
  // sees admin accounts at all (see AdminUserViewSet.get_queryset) and
  // can never create/promote one (see AdminUserWriteSerializer.validate)
  // — so "Admin" shouldn't even appear as a selectable role here, or
  // picking it would just fail with a confusing error after the fact.
  if (currentUser.role !== "admin") {
    roles = roles.filter((r) => r.slug !== "admin");
  }

  return (
    <UsersManager
      users={users}
      roles={roles}
      districts={districts}
      currentUserId={currentUser.id}
      isAdmin={currentUser.role === "admin"}
      canManageSystem={currentUser.permissions.includes("manage_system")}
      canImpersonate={currentUser.permissions.includes("impersonate_users")}
      canOverrideImpersonation={currentUser.permissions.includes("override_impersonation_otp")}
    />
  );
}
