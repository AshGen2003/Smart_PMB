import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView, type FarmerProfileDetails } from "@/app/components/ProfileView";

export default async function FarmerProfilePage() {
  const user = await requireUser();

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
