/**
 * `/pricing` — guaranteed paddy pricing management. Requires the
 * `manage_pricing` permission; redirects unauthorized users.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import PricingManager, { type PaddyTypeRow } from "./PricingManager";

/** Server Component: gates access, fetches all paddy types, and renders the client-side manager. */
export default async function PricingPage() {
  await requirePermission("manage_pricing");

  const res = await apiFetch("/api/admin/paddy-types/");
  const paddyTypes = res.ok ? ((await res.json()) as PaddyTypeRow[]) : [];

  return <PricingManager paddyTypes={paddyTypes} />;
}
