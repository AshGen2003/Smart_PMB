/**
 * `/farmer/harvests` — full harvest history for the logged-in farmer, plus
 * the ability to submit a new delivery and withdraw one while it's pending.
 * Fetches its own data directly (unlike the dashboard's aggregate endpoint)
 * since this page needs the farmer's complete harvest list, not just the
 * most recent few.
 */
import { apiFetch } from "@/app/lib/api";
import HarvestsManager, { type HarvestRow } from "./HarvestsManager";
import { type PaddyTypeOption } from "./LogHarvestModal";

export default async function FarmerHarvestsPage() {
  const [harvestsRes, paddyTypesRes] = await Promise.all([
    apiFetch("/api/farmer/harvests/"),
    apiFetch("/api/admin/paddy-types/"),
  ]);

  const harvests: HarvestRow[] = harvestsRes.ok ? await harvestsRes.json() : [];
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];

  return <HarvestsManager harvests={harvests} paddyTypes={paddyTypes} />;
}
