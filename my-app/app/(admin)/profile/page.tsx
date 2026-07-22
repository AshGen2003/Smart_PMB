/**
 * `/profile` — the logged-in admin/officer's own profile page. Available to
 * any authenticated non-farmer user (no specific permission required
 * beyond being logged in).
 */
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView } from "@/app/components/ProfileView";

/** Server Component: loads the current user's session info and extended profile fields, then renders the shared ProfileView component. */
export default async function AdminProfilePage() {
  const user = await requireUser();

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <ProfileView
      fullName={user.fullName ?? ""}
      email={user.email}
      roleName={user.roleName}
      permissions={user.permissions}
      nic={me?.nic ?? ""}
      phoneNumber={me?.phone_number ?? ""}
      profilePictureUrl={me?.profile_picture ?? null}
    />
  );
}
