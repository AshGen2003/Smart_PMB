/**
 * `/farmer/profile` — the logged-in farmer's own profile page, including
 * farmer-specific details (registration number, land size, district) that
 * the shared ProfileView component renders only when `farmerDetails` is
 * passed in.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView, type FarmerProfileDetails } from "@/app/components/ProfileView";

/**
 * Server Component: loads the current user's session info (extended
 * profile fields included — see lib/dal.ts) plus farmer-specific details
 * (pulled from the dashboard endpoint's `farmer` key), then renders the
 * shared ProfileView component.
 */
export default async function FarmerProfilePage() {
  const user = await requirePermission("view_profile");

  const dashboardRes = await apiFetch("/api/farmer/dashboard/");
  const farmerDetails: FarmerProfileDetails | null = dashboardRes.ok
    ? (await dashboardRes.json()).farmer
    : null;

  return (
    <ProfileView
      fullName={user.fullName ?? ""}
      email={user.email}
      roleName={user.roleName}
      permissions={user.permissions}
      nic={user.nic}
      phoneNumber={user.phoneNumber}
      profilePictureUrl={user.profilePictureUrl}
      farmerDetails={farmerDetails}
    />
  );
}
