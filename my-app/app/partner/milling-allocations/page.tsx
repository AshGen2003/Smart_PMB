/**
 * `/partner/milling-allocations` — the logged-in mill owner's raw-paddy
 * allocation request history and milled-rice return request history, plus
 * forms to submit new ones. The real, reachable home for this feature
 * (linked from PartnerSidebar) — a near-identical copy also exists at
 * mill-owner/milling-allocations for the older, no-longer-linked
 * mill-owner/ portal (mill owners are routed to /partner on login, same as
 * authorized purchasers; see actions/auth.ts's login redirect).
 */
import { apiFetch } from "@/app/lib/api";
import MillingAllocationsManager, {
  type AllocationRow,
  type ReturnRow,
} from "./MillingAllocationsManager";
import { type PaddyTypeOption } from "./MillingAllocationForm";
import { type WarehouseOption } from "./RequestReturnForm";

export default async function PartnerMillingAllocationsPage() {
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
