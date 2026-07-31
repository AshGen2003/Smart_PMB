/**
 * Shared layout for the warehouse-manager-facing portal (dashboard,
 * warehouses, intake, alerts, messages, profile, settings). Mirrors
 * app/mill-owner/layout.tsx.
 */
import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import WarehouseManagerShell from "@/app/components/WarehouseManagerShell";

/**
 * Verifies the visitor is logged in with the "warehouse_manager" role
 * (redirects otherwise), fetches their profile for the avatar, and renders
 * the WarehouseManagerShell around the page content.
 */
export default async function WarehouseManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("warehouse_manager");

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <WarehouseManagerShell
      userName={user.fullName ?? user.email}
      profilePictureUrl={me?.profile_picture ?? null}
      previewing={user.previewing}
    >
      {children}
    </WarehouseManagerShell>
  );
}
