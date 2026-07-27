/**
 * `/mill-owner/profile` — the logged-in mill owner's own profile page,
 * including mill-specific details (registration number, capacity,
 * district) that the shared ProfileView component renders only when
 * `millDetails` is passed in. Mirrors app/farmer/profile/page.tsx.
 */
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView, type MillProfileDetails } from "@/app/components/ProfileView";

export default async function MillOwnerProfilePage() {
  const user = await requireUser();

  const [meRes, dashboardRes] = await Promise.all([
    apiFetch("/api/auth/me/"),
    apiFetch("/api/mill-owner/dashboard/"),
  ]);
  const me = meRes.ok ? await meRes.json() : null;
  const millDetails: MillProfileDetails | null = dashboardRes.ok
    ? (await dashboardRes.json()).mill
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
      millDetails={millDetails}
    />
  );
}
