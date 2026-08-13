/**
 * `/warehouses` — warehouse inventory management. Requires the
 * `manage_warehouses` permission. While Portal Preview is active,
 * `user.permissions` already reflects the *previewed* role's permissions
 * (see lib/dal.ts), so this needs no separate `manage_roles` fallback for
 * preview to reach the page — and not having one means a real admin who
 * lacks manage_warehouses can't view real data by just visiting this URL
 * directly outside of a preview session. Preview never fetches real data —
 * see previewSampleData.ts.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch, apiFetchCached } from "@/app/lib/api";
import { PREVIEW_DISTRICTS, PREVIEW_WAREHOUSES } from "@/app/lib/previewSampleData";
import WarehousesManager, {
  type AlertRow,
  type OfficerOption,
  type WarehouseRow,
} from "./WarehousesManager";
import type { DistrictOption } from "./WarehouseFormModal";
import type { InventoryLine, TransactionLogEntry } from "./WarehouseDetailModal";

/** Server Component: gates access, fetches warehouses, the district/officer lists (for the create/edit form's pickers), and the inventory/transaction-log detail data. */
export default async function WarehousesPage() {
  const user = await requirePermission("manage_warehouses");
  // Portal Preview is always read-only (see components/PreviewBanner.tsx),
  // regardless of whether the previewed role would normally have write
  // access — never let a preview session actually mutate real data.
  const canWrite = !user.previewing;

  // Preview shows fake data only — never the real warehouse list — so
  // previewing a role can never expose real operational data.
  if (user.previewing) {
    return (
      <WarehousesManager
        warehouses={PREVIEW_WAREHOUSES}
        districts={PREVIEW_DISTRICTS}
        officers={[]}
        inventory={[]}
        transactions={[]}
        alerts={[]}
        permissions={user.permissions}
        canWrite={false}
        role={user.role}
      />
    );
  }

  // Warehouses are also reused as reference data on /approvals and
  // /transportation; districts are largely static reference data — see
  // apiFetchCached's docstring. revalidateTag("warehouses") in
  // actions/warehouses.ts keeps the warehouse list fresh on mutation.
  const [warehousesRes, districtsRes, officersRes, inventoryRes, transactionsRes, alertsRes] =
    await Promise.all([
      apiFetchCached("/api/admin/warehouses/", 300, ["warehouses"]),
      apiFetchCached("/api/districts/", 3600, ["districts"]),
      apiFetch("/api/admin/warehouse-managers/"),
      apiFetch("/api/admin/inventory/"),
      apiFetch("/api/admin/transaction-log/"),
      apiFetch("/api/admin/warehouses/alerts/"),
    ]);

  const warehouses = warehousesRes.ok ? ((await warehousesRes.json()) as WarehouseRow[]) : [];
  const districts = districtsRes.ok ? ((await districtsRes.json()) as DistrictOption[]) : [];
  const officers = officersRes.ok ? ((await officersRes.json()) as OfficerOption[]) : [];
  const inventory = inventoryRes.ok ? ((await inventoryRes.json()) as InventoryLine[]) : [];
  const transactions = transactionsRes.ok ? ((await transactionsRes.json()) as TransactionLogEntry[]) : [];
  const alerts = alertsRes.ok ? ((await alertsRes.json()) as AlertRow[]) : [];

  return (
    <WarehousesManager
      warehouses={warehouses}
      districts={districts}
      officers={officers}
      inventory={inventory}
      transactions={transactions}
      alerts={alerts}
      permissions={user.permissions}
      canWrite={canWrite}
      role={user.role}
    />
  );
}
