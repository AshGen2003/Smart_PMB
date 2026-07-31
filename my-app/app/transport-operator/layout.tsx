/**
 * Shared layout for the transport-operator-facing portal (dashboard,
 * fleet, messages, profile, settings). Mirrors app/mill-owner/layout.tsx.
 */
import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import TransportOperatorShell from "@/app/components/TransportOperatorShell";

/**
 * Verifies the visitor is logged in with the "transport_operator" role
 * (redirects otherwise), fetches their profile for the avatar, and renders
 * the TransportOperatorShell around the page content.
 */
export default async function TransportOperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("transport_operator");

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <TransportOperatorShell
      userName={user.fullName ?? user.email}
      profilePictureUrl={me?.profile_picture ?? null}
      previewing={user.previewing}
    >
      {children}
    </TransportOperatorShell>
  );
}
