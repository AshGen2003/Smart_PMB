import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import ApprovalsManager, { type HarvestRow } from "./ApprovalsManager";
import type { FarmerOption, PaddyTypeOption, WarehouseOption } from "./HarvestFormModal";

export default async function ApprovalsPage() {
  const user = await requireAnyPermission("monitor_operations", "record_purchases");
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
