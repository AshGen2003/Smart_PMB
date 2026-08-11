/**
 * `/milling-allocations` — mill owners' raw-paddy allocation review queue
 * and the milled-rice return requests that follow a fulfilled one. Viewable
 * by anyone with `monitor_operations` (read-only) or `record_purchases`
 * (full read/write: approve, reject, fulfill). Mirrors
 * (admin)/purchase-requests/page.tsx.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MillingReviewManager, {
  type MillingAllocationRow,
  type MillingReturnRow,
  type WarehouseOption,
} from "./MillingReviewManager";

export default async function MillingAllocationsAdminPage() {
  const user = await requireAnyPermission("monitor_operations", "record_purchases");
  const canWrite = user.permissions.includes("record_purchases") && !user.previewing;

  const [allocationsRes, returnsRes, warehousesRes] = await Promise.all([
    apiFetch("/api/admin/milling-allocations/"),
    apiFetch("/api/admin/milling-returns/"),
    apiFetch("/api/warehouses/options/"),
  ]);

  const allocations: MillingAllocationRow[] = allocationsRes.ok ? await allocationsRes.json() : [];
  const returns: MillingReturnRow[] = returnsRes.ok ? await returnsRes.json() : [];
  const warehouses: WarehouseOption[] = warehousesRes.ok ? await warehousesRes.json() : [];

  return (
    <MillingReviewManager
      allocations={allocations}
      returns={returns}
      warehouses={warehouses}
      canWrite={canWrite}
    />
  );
}
