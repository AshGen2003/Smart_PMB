/**
 * `/driver/profile` — the logged-in driver's own profile page. Drivers
 * have no separate profile model (unlike farmers) — just the shared
 * ProfileView component showing their User fields and (empty) permissions.
 */
import { requirePermission } from "@/app/lib/dal";
import { ProfileView } from "@/app/components/ProfileView";

export default async function DriverProfilePage() {
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
