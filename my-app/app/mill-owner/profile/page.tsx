/**
 * `/mill-owner/profile` — the logged-in mill owner's own profile page.
 * Gets their mill details (registration number, capacity, district)
 * rendered instead of the permissions list, sourced from GET
 * /api/mill-owner/dashboard/'s nested `mill` object.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView, type MillProfileDetails } from "@/app/components/ProfileView";

export default async function MillOwnerProfilePage() {
  const user = await requirePermission("view_profile");

  const millDetails: MillProfileDetails | null = !user.previewing
    ? await apiFetch("/api/mill-owner/dashboard/").then((res) =>
        res.ok ? res.json().then((data) => data.mill) : null
      )
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
      millDetails={millDetails}
    />
  );
}
