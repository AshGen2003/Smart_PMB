import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import PricingManager, { type PaddyTypeRow } from "./PricingManager";

export default async function PricingPage() {
  await requirePermission("manage_pricing");

  const res = await apiFetch("/api/admin/paddy-types/");
  const paddyTypes = res.ok ? ((await res.json()) as PaddyTypeRow[]) : [];

  return <PricingManager paddyTypes={paddyTypes} />;
}
