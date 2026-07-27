/**
 * Shared layout for the mill-owner-facing portal (dashboard, licenses,
 * milling reports, messages, profile, settings). Mirrors app/farmer/layout.tsx.
 */
import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MillOwnerShell from "@/app/components/MillOwnerShell";

/**
 * Verifies the visitor is logged in with the "mill_owner" role (redirects
 * otherwise), fetches their profile for the avatar, and renders the
 * MillOwnerShell around the page content.
 */
export default async function MillOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("mill_owner");

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <MillOwnerShell
      userName={user.fullName ?? user.email}
      profilePictureUrl={me?.profile_picture ?? null}
      previewing={user.previewing}
    >
      {children}
    </MillOwnerShell>
  );
}
