/**
 * `/partner/profile` — the logged-in authorized purchaser / mill owner's
 * own profile page. Mill owners get their mill details (registration
 * number, capacity, district) rendered instead of the permissions list,
 * sourced from GET /api/mill-owner/dashboard/'s nested `mill` object.
 * Authorized purchasers similarly get their AuthorizedPurchaser profile
 * (organization, registration no., district) from GET
 * /api/purchaser/dashboard/'s nested `authorized_purchaser` object — null
 * for an admin-created purchaser account, which has no such profile (see
 * accounts/serializers.py's RegisterLicenseApplicantSerializer, the only
 * place this profile is ever created).
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import {
  ProfileView,
  type AuthorizedPurchaserProfileDetails,
  type MillProfileDetails,
} from "@/app/components/ProfileView";

export default async function PartnerProfilePage() {
  const user = await requirePermission("view_profile");

  const millDetails: MillProfileDetails | null =
    !user.previewing && user.role === "mill_owner"
      ? await apiFetch("/api/mill-owner/dashboard/").then((res) =>
          res.ok ? res.json().then((data) => data.mill) : null
        )
      : null;

  const authorizedPurchaserDetails: AuthorizedPurchaserProfileDetails | null =
    !user.previewing && user.role === "authorized_purchaser"
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
      millDetails={millDetails}
      authorizedPurchaserDetails={authorizedPurchaserDetails}
    />
  );
}
