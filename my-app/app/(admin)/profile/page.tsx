/**
 * `/profile` — the logged-in admin/officer's own profile page. Requires
 * `view_profile` — granted to every role by default (see the accounts/0015
 * migration), toggleable per role from /roles or the Preview Portal's
 * quick-toggle checklist.
 */
import { requirePermission } from "@/app/lib/dal";
import { ProfileView } from "@/app/components/ProfileView";

/** Server Component: loads the current user's session info (extended profile fields included — see lib/dal.ts) and renders the shared ProfileView component. */
export default async function AdminProfilePage() {
  const user = await requirePermission("view_profile");

  return (
    <ProfileView
      fullName={user.fullName ?? ""}
      email={user.email}
      roleName={user.roleName}
      permissions={user.permissions}
      nic={user.nic}
      phoneNumber={user.phoneNumber}
      profilePictureUrl={user.profilePictureUrl}
    />
  );
}
