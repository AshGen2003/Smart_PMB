/**
 * `/mill-owner/milling-allocations` — the logged-in mill owner's raw-paddy
 * allocation request history and milled-rice return request history, plus
 * forms to submit new ones. Mirrors mill-owner/licenses/page.tsx.
 */
import { apiFetch } from "@/app/lib/api";
import MillingAllocationsManager, {
  type AllocationRow,
  type ReturnRow,
} from "./MillingAllocationsManager";
import { type PaddyTypeOption } from "./MillingAllocationForm";
import { type WarehouseOption } from "./RequestReturnForm";

export default async function MillingAllocationsPage() {
  const [allocationsRes, returnsRes, paddyTypesRes, warehousesRes] = await Promise.all([
    apiFetch("/api/mill-owner/milling-allocations/"),
    apiFetch("/api/mill-owner/milling-returns/"),
    apiFetch("/api/admin/paddy-types/"),
    apiFetch("/api/warehouses/options/"),
  ]);

  const allocations: AllocationRow[] = allocationsRes.ok ? await allocationsRes.json() : [];
  const returns: ReturnRow[] = returnsRes.ok ? await returnsRes.json() : [];
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];
  const warehouses: WarehouseOption[] = warehousesRes.ok ? await warehousesRes.json() : [];

  return (
    <MillingAllocationsManager
      allocations={allocations}
      returns={returns}
      paddyTypes={paddyTypes}
      warehouses={warehouses}
    />
  );
}
