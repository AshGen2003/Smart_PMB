/**
 * `/purchase-requests` — Authorized Purchasers' rice request review queue.
 * Viewable by anyone with `monitor_operations` (read-only) or
 * `record_purchases` (full read/write: approve, reject, fulfill). Mirrors
 * (admin)/licenses/page.tsx.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import PurchaseRequestsManager, { type RiceRequestRow, type WarehouseOption } from "./PurchaseRequestsManager";
import PurchaserLimitsManager, { type PurchaserRow } from "./PurchaserLimitsManager";

export default async function PurchaseRequestsPage() {
  const user = await requireAnyPermission("monitor_operations", "record_purchases");
  const canWrite = user.permissions.includes("record_purchases") && !user.previewing;

  const [requestsRes, warehousesRes, purchasersRes] = await Promise.all([
    apiFetch("/api/admin/rice-requests/"),
    apiFetch("/api/admin/warehouses/"),
    canWrite ? apiFetch("/api/admin/authorized-purchasers/") : Promise.resolve(null),
  ]);
  const requests: RiceRequestRow[] = requestsRes.ok ? await requestsRes.json() : [];
  const warehouses: WarehouseOption[] = warehousesRes.ok ? await warehousesRes.json() : [];
  const purchasers: PurchaserRow[] = purchasersRes?.ok ? await purchasersRes.json() : [];

  return (
    <>
      <PurchaseRequestsManager requests={requests} warehouses={warehouses} canWrite={canWrite} />
      {canWrite && <PurchaserLimitsManager purchasers={purchasers} />}
    </>
  );
}
