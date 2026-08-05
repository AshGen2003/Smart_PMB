/**
 * `/partner/farm-gate-purchases` — an Authorized Purchaser's direct
 * at-source purchase history and dispatch-manifest history, plus the forms
 * to record a new purchase and bundle unassigned purchases into a manifest.
 * Mirrors mill-owner/milling-allocations/page.tsx.
 */
import { apiFetch } from "@/app/lib/api";
import FarmGatePurchasesManager, {
  type DispatchManifestRow,
  type FarmGatePurchaseRow,
} from "./FarmGatePurchasesManager";
import { type PaddyTypeOption } from "./FarmGatePurchaseForm";
import { type WarehouseOption } from "./DispatchManifestForm";

export default async function FarmGatePurchasesPage() {
  const [purchasesRes, manifestsRes, paddyTypesRes, warehousesRes] = await Promise.all([
    apiFetch("/api/purchaser/farm-gate-purchases/"),
    apiFetch("/api/purchaser/dispatch-manifests/"),
    apiFetch("/api/admin/paddy-types/"),
    apiFetch("/api/warehouses/options/"),
  ]);

  const purchases: FarmGatePurchaseRow[] = purchasesRes.ok ? await purchasesRes.json() : [];
  const manifests: DispatchManifestRow[] = manifestsRes.ok ? await manifestsRes.json() : [];
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];
  const warehouses: WarehouseOption[] = warehousesRes.ok ? await warehousesRes.json() : [];

  return (
    <FarmGatePurchasesManager
      purchases={purchases}
      manifests={manifests}
      paddyTypes={paddyTypes}
      warehouses={warehouses}
    />
  );
}
