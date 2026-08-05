/**
 * `/farmer/price-history` — guaranteed-price history for every active
 * paddy type, grouped by type. Fetches the paddy type list, then each
 * type's price-history action (farmers.views.PaddyTypeViewSet.
 * price_history) in parallel.
 */
import { apiFetch } from "@/app/lib/api";
import PriceHistoryManager, { type PaddyTypeGroup, type PriceRecordRow } from "./PriceHistoryManager";

type PaddyType = { id: number; type_name: string; guaranteed_price: string };

export default async function FarmerPriceHistoryPage() {
  const paddyTypesRes = await apiFetch("/api/admin/paddy-types/");
  const paddyTypes: PaddyType[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];

  const groups: PaddyTypeGroup[] = await Promise.all(
    paddyTypes.map(async (paddyType) => {
      const res = await apiFetch(`/api/admin/paddy-types/${paddyType.id}/price-history/`);
      const records: PriceRecordRow[] = res.ok ? await res.json() : [];
      return { paddyType, records };
    })
  );

  return <PriceHistoryManager groups={groups} />;
}
