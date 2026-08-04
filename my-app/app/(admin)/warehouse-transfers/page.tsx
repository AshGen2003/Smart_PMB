/**
 * `/warehouse-transfers` — review queue for warehouse managers' stock
 * transfer requests. Requires the `manage_warehouses` permission, same as
 * `/warehouses`.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import TransferRequestsManager, { type TransferRequestRow } from "./TransferRequestsManager";

export default async function WarehouseTransfersPage() {
  const user = await requirePermission("manage_warehouses");
  const canWrite = !user.previewing;

  const res = await apiFetch("/api/admin/warehouse-transfers/");
  const requests: TransferRequestRow[] = res.ok ? await res.json() : [];

  return <TransferRequestsManager requests={requests} canWrite={canWrite} />;
}
