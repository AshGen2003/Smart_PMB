/**
 * `/purchaser/profile` — the logged-in authorized purchaser's own profile
 * page. Gets their AuthorizedPurchaser profile (organization, registration
 * no., district) rendered instead of the permissions list, sourced from
 * GET /api/purchaser/dashboard/'s nested `authorized_purchaser` object —
 * null for an admin-created purchaser account, which has no such profile
 * (see accounts/serializers.py's RegisterLicenseApplicantSerializer, the
 * only place this profile is ever created).
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView, type AuthorizedPurchaserProfileDetails } from "@/app/components/ProfileView";

export default async function PurchaserProfilePage() {
  const user = await requirePermission("view_profile");

  const authorizedPurchaserDetails: AuthorizedPurchaserProfileDetails | null = !user.previewing
    ? await apiFetch("/api/purchaser/dashboard/").then((res) =>
        res.ok ? res.json().then((data) => data.authorized_purchaser) : null
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
      authorizedPurchaserDetails={authorizedPurchaserDetails}
    />
  );
}
