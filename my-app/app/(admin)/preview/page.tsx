/**
 * `/preview` — "Portal Preview": lets an admin see what navigation each
 * role can access (a live mockup of that role's sidebar) and enter a real,
 * read-only preview session as that role. Permission editing lives on
 * `/roles` — this page is just the sidebar view + Enter Preview.
 * Requires the `manage_roles` permission — the same gate as `/roles`.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import PreviewManager from "./PreviewManager";
import type { RoleRow } from "../roles/RolesManager";

/** Server Component: gates access, fetches all roles (excluding Admin — there's nothing to preview for the role already doing the previewing). */
export default async function PreviewPage() {
  await requirePermission("manage_roles");

  const rolesRes = await apiFetch("/api/admin/roles/");
  const allRoles = rolesRes.ok ? ((await rolesRes.json()) as RoleRow[]) : [];
  const roles = allRoles.filter((r) => r.slug !== "admin");

  return <PreviewManager roles={roles} />;
}
