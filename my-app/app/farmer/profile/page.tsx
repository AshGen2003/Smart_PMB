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
 * Server Component: loads the current user's session info plus extended
 * profile fields and farmer details (pulled from the dashboard endpoint's
 * `farmer` key), then renders the shared ProfileView component.
 */
export default async function FarmerProfilePage() {
  const user = await requirePermission("view_profile");

  const [meRes, dashboardRes] = await Promise.all([
    apiFetch("/api/auth/me/"),
    apiFetch("/api/farmer/dashboard/"),
  ]);
  const me = meRes.ok ? await meRes.json() : null;
  const farmerDetails: FarmerProfileDetails | null = dashboardRes.ok
    ? (await dashboardRes.json()).farmer
    : null;

  return (
    <ProfileView
      fullName={user.fullName ?? ""}
      email={user.email}
      roleName={user.roleName}
      permissions={user.permissions}
      nic={me?.nic ?? ""}
      phoneNumber={me?.phone_number ?? ""}
      profilePictureUrl={me?.profile_picture ?? null}
      farmerDetails={farmerDetails}
    />
  );
}
