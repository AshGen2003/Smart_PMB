/**
 * `/warehouse-manager/deliveries` — read-only view of loads carrying a
 * purchaser's fulfilled rice request out of the logged-in manager's own
 * warehouse (see farmers/views.py's WarehouseManagerDeliveriesView, scoped
 * server-side to Warehouse.managed_by == this account). Shows transport
 * status plus, once the purchaser confirms on their end, the receipt
 * confirmation that closes the loop.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import DeliveriesManager, { type DeliveryRow } from "./DeliveriesManager";

export default async function WarehouseManagerDeliveriesPage() {
  await requirePermission("view_dashboard");

  const res = await apiFetch("/api/warehouse-manager/deliveries/");
  const deliveries: DeliveryRow[] = res.ok ? await res.json() : [];

  return <DeliveriesManager deliveries={deliveries} />;
}
