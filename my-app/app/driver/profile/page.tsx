/**
 * `/driver/profile` — the logged-in driver's own profile page. Drivers
 * have no separate profile model (unlike farmers) — just the shared
 * ProfileView component showing their User fields and (empty) permissions.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView } from "@/app/components/ProfileView";

export default async function DriverProfilePage() {
  const user = await requirePermission("view_profile");

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
