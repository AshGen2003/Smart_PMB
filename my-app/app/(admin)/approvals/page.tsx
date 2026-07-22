/**
 * `/approvals` — harvest purchase approvals queue. Viewable by anyone with
 * `monitor_operations` (read-only) or `record_purchases` (full read/write:
 * create, edit, approve, reject, mark collected, delete harvest records).
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import ApprovalsManager, { type HarvestRow } from "./ApprovalsManager";
import type { FarmerOption, PaddyTypeOption, WarehouseOption } from "./HarvestFormModal";

/**
 * Server Component: gates access, fetches harvests plus the reference data
 * (farmers/paddy types/warehouses) needed to populate the create/edit form
 * dropdowns, then hands everything to the client-side ApprovalsManager.
 */
export default async function ApprovalsPage() {
  // Redirects to an unauthorized page if the user has neither permission.
  const user = await requireAnyPermission("monitor_operations", "record_purchases");
  // Only record_purchases holders get write access (approve/reject/edit/delete);
  // monitor_operations-only users get a read-only view.
  const canWrite = user.permissions.includes("record_purchases");

  const [harvestsRes, farmersRes, paddyTypesRes, warehousesRes] = await Promise.all([
    apiFetch("/api/admin/harvests/"),
    apiFetch("/api/officer/farmers/"),
    apiFetch("/api/admin/paddy-types/"),
    apiFetch("/api/admin/warehouses/"),
  ]);

  const harvests = harvestsRes.ok ? ((await harvestsRes.json()) as HarvestRow[]) : [];
  const farmers = farmersRes.ok ? ((await farmersRes.json()) as FarmerOption[]) : [];
  const paddyTypes = paddyTypesRes.ok ? ((await paddyTypesRes.json()) as PaddyTypeOption[]) : [];
  const warehouses = warehousesRes.ok ? ((await warehousesRes.json()) as WarehouseOption[]) : [];

  return (
    <ApprovalsManager
      harvests={harvests}
      farmers={farmers}
      paddyTypes={paddyTypes}
      warehouses={warehouses}
      canWrite={canWrite}
    />
  );
}
