/**
 * `/farmer/delivery-slots` — a farmer's advance warehouse delivery
 * bookings: full history, a form to book a new slot, and cancellation
 * while still booked. Mirrors farmer/harvests/page.tsx.
 */
import { apiFetch } from "@/app/lib/api";
import DeliverySlotsManager, { type DeliverySlotRow } from "./DeliverySlotsManager";
import { type PaddyTypeOption, type WarehouseOption } from "./BookDeliverySlotModal";

export default async function FarmerDeliverySlotsPage() {
  const [slotsRes, warehousesRes, paddyTypesRes] = await Promise.all([
    apiFetch("/api/farmer/delivery-slots/"),
    apiFetch("/api/warehouses/options/"),
    apiFetch("/api/admin/paddy-types/"),
  ]);

  const slots: DeliverySlotRow[] = slotsRes.ok ? await slotsRes.json() : [];
  const warehouses: WarehouseOption[] = warehousesRes.ok ? await warehousesRes.json() : [];
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];

  return <DeliverySlotsManager slots={slots} warehouses={warehouses} paddyTypes={paddyTypes} />;
}
