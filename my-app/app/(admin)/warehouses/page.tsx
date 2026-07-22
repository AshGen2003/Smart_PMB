/**
 * `/warehouses` — warehouse inventory management. Requires the
 * `manage_warehouses` permission.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import WarehousesManager, { type WarehouseRow } from "./WarehousesManager";
import type { DistrictOption } from "./WarehouseFormModal";

/** Server Component: gates access, fetches warehouses and the district list (for the create/edit form's location picker). */
export default async function WarehousesPage() {
  await requirePermission("manage_warehouses");

  const [warehousesRes, districtsRes] = await Promise.all([
    apiFetch("/api/admin/warehouses/"),
    apiFetch("/api/districts/"),
  ]);

  const warehouses = warehousesRes.ok ? ((await warehousesRes.json()) as WarehouseRow[]) : [];
  const districts = districtsRes.ok ? ((await districtsRes.json()) as DistrictOption[]) : [];

  return <WarehousesManager warehouses={warehouses} districts={districts} />;
}
