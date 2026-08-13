/**
 * `/purchaser/deliveries` — the Authorized Purchaser's view of incoming
 * loads: every fulfilled rice request that has a Delivery moving it out of
 * a warehouse, its live transport status, and a "Confirm Received" action
 * once the driver has marked it delivered (see purchases.RiceRequestViewSet.
 * confirm_receipt on the backend). Reuses GET /api/purchaser/requests/
 * (same data RiceRequestsManager's table shows inline) rather than a
 * separate endpoint, filtered down to requests that actually have a
 * delivery attached.
 */
import { apiFetch } from "@/app/lib/api";
import DeliveriesManager, { type RiceRequestRow } from "./DeliveriesManager";

export default async function PurchaserDeliveriesPage() {
  const res = await apiFetch("/api/purchaser/requests/");
  const requests: RiceRequestRow[] = res.ok ? await res.json() : [];
  const deliveries = requests.filter((r) => r.delivery !== null);

  return <DeliveriesManager deliveries={deliveries} />;
}
