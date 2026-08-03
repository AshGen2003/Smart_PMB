/**
 * Shared layout for the warehouse-manager portal (dashboard, messages,
 * settings, profile). Every page under `app/warehouse-manager/` is
 * rendered as `children` inside this layout, wrapped in
 * WarehouseManagerShell — mirrors driver/layout.tsx.
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/app/lib/dal";
import WarehouseManagerShell from "@/app/components/WarehouseManagerShell";

export default async function WarehouseManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("warehouse_manager");

  // An admin/officer-set (or reset) temporary password must be changed
  // before this account reaches any real page.
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <WarehouseManagerShell
      permissions={user.permissions}
      notifyMessages={user.notifyMessages}
      previewing={user.previewing}
      impersonating={user.impersonating}
    >
      {children}
    </WarehouseManagerShell>
  );
}
