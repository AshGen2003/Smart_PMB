/**
 * `/warehouse-manager/delivery-slots` — lookup and check-in screen for a
 * farmer's advance delivery-slot booking. Reached either by scanning the
 * farmer's booking QR (which encodes this exact URL with `?ref=` — see
 * farmers.views.DeliverySlotQrView) or by typing a reference in by hand.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import DeliverySlotCheckIn, { type DeliverySlotLookupRow } from "./DeliverySlotCheckIn";

export default async function WarehouseManagerDeliverySlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  await requirePermission("view_dashboard");
  const { ref } = await searchParams;

  let initialSlot: DeliverySlotLookupRow | null = null;
  let initialError: string | null = null;

  if (ref) {
    const res = await apiFetch(`/api/warehouse-manager/delivery-slots/lookup/?ref=${encodeURIComponent(ref)}`);
    if (res.ok) {
      initialSlot = await res.json();
    } else {
      const data = await res.json().catch(() => ({}));
      initialError = data.detail ?? "No booking found with that reference for your warehouse.";
    }
  }

  return <DeliverySlotCheckIn initialRef={ref ?? ""} initialSlot={initialSlot} initialError={initialError} />;
}
