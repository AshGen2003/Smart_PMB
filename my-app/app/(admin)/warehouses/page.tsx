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
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_DISTRICTS, PREVIEW_WAREHOUSES } from "@/app/lib/previewSampleData";
import WarehousesManager, { type WarehouseRow } from "./WarehousesManager";
import type { DistrictOption } from "./WarehouseFormModal";

/** Server Component: gates access, fetches warehouses and the district list (for the create/edit form's location picker). */
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
        canWrite={false}
      />
    );
  }

  const [warehousesRes, districtsRes] = await Promise.all([
    apiFetch("/api/admin/warehouses/"),
    apiFetch("/api/districts/"),
  ]);

  const warehouses = warehousesRes.ok ? ((await warehousesRes.json()) as WarehouseRow[]) : [];
  const districts = districtsRes.ok ? ((await districtsRes.json()) as DistrictOption[]) : [];

  return <WarehousesManager warehouses={warehouses} districts={districts} canWrite={canWrite} />;
}
