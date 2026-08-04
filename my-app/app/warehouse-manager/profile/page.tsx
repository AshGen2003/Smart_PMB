/**
 * `/warehouse-manager/profile` — the logged-in warehouse manager's own
 * profile page. Warehouse managers have no separate profile model (like
 * drivers) — just the shared ProfileView component showing their User
 * fields and (empty) permissions.
 */
import { requirePermission } from "@/app/lib/dal";
import { ProfileView } from "@/app/components/ProfileView";

export default async function WarehouseManagerProfilePage() {
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
