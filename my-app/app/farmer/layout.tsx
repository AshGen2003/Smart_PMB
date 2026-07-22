/**
 * Shared layout for the farmer-facing portal (dashboard, profile,
 * settings). Every page under `app/farmer/` is rendered as `children`
 * inside this layout, wrapped in the FarmerShell (farmer sidebar/header,
 * distinct from the admin AdminShell).
 */
import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import FarmerShell from "@/app/components/FarmerShell";

/**
 * Verifies the visitor is logged in with the "farmer" role (redirects
 * otherwise — this is what keeps admins/officers out of the farmer portal
 * and vice versa), fetches their profile for the avatar, and renders the
 * FarmerShell around the page content.
 */
export default async function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("farmer");

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <FarmerShell
      userName={user.fullName ?? user.email}
      profilePictureUrl={me?.profile_picture ?? null}
      previewing={user.previewing}
    >
      {children}
    </FarmerShell>
  );
}
