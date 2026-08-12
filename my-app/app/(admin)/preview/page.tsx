/**
 * `/preview` — "Portal Preview": lets an admin see what navigation each
 * role can access (a live, clickable mockup of that role's sidebar, with a
 * checkbox per button to grant/revoke it on the spot) and enter a real,
 * read-only preview session as that role. The full role editor (rename,
 * delete, and permissions with no sidebar button of their own) still lives
 * on `/roles` — this page is the quick-toggle view for sidebar buttons
 * specifically. Requires the `manage_roles` permission — the same gate as
 * `/roles`.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetchCached } from "@/app/lib/api";
import PreviewManager from "./PreviewManager";
import type { RoleRow } from "../roles/RolesManager";

/** Server Component: gates access, fetches all roles (excluding Admin — there's nothing to preview for the role already doing the previewing). */
export default async function PreviewPage() {
  await requirePermission("manage_roles");

  // Reference data shared with /roles and /users — see
  // apiFetchCached's docstring.
  const rolesRes = await apiFetchCached("/api/admin/roles/", 300, ["roles"]);
  const allRoles = rolesRes.ok ? ((await rolesRes.json()) as RoleRow[]) : [];
  const roles = allRoles.filter((r) => r.slug !== "admin");

  return <PreviewManager roles={roles} />;
}
