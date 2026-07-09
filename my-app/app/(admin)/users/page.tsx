import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import UsersManager, { type AdminUserRow } from "./UsersManager";

export default async function UsersPage() {
  const currentUser = await requireRole("admin");

  const res = await apiFetch("/api/admin/users/");
  const users = res.ok ? ((await res.json()) as AdminUserRow[]) : [];

  return <UsersManager users={users} currentUserId={currentUser.id} />;
}
