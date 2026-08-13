/**
 * `/pricing` — guaranteed paddy pricing management. Requires the
 * `manage_pricing` permission. While Portal Preview is active,
 * `user.permissions` already reflects the *previewed* role's permissions
 * (see lib/dal.ts), so no separate `manage_roles` fallback is needed for
 * preview to reach the page — and not having one means a real admin who
 * lacks manage_pricing can't view real data by just visiting this URL
 * directly outside of a preview session. Preview never fetches real data —
 * see previewSampleData.ts.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetchCached } from "@/app/lib/api";
import { PREVIEW_PADDY_TYPES } from "@/app/lib/previewSampleData";
import PricingManager, { type PaddyTypeRow } from "./PricingManager";

/** Server Component: gates access, fetches all paddy types, and renders the client-side manager. */
export default async function PricingPage() {
  const user = await requirePermission("manage_pricing");
  // Portal Preview is always read-only, regardless of what the previewed
  // role would normally be able to do — see components/PreviewBanner.tsx.
  const canWrite = !user.previewing;

  if (user.previewing) {
    return <PricingManager paddyTypes={PREVIEW_PADDY_TYPES} canWrite={false} />;
  }

  // Also reused as reference data on /approvals's harvest form — see
  // apiFetchCached's docstring. revalidateTag("paddy-types") in
  // actions/pricing.ts keeps this fresh the moment a price changes.
  const res = await apiFetchCached("/api/admin/paddy-types/", 300, ["paddy-types"]);
  const paddyTypes = res.ok ? ((await res.json()) as PaddyTypeRow[]) : [];

  // Pre-fetched here (Server Component) rather than on-demand client-side —
  // keeps the page on the "Server Component fetches, Client Component just
  // renders" convention with no client-side auth fetch needed. The list is
  // small enough that fetching every paddy type's history up front is cheap.
  const priceHistory: Record<number, { id: number; guaranteed_price: string; season: "yala" | "maha"; effective_date: string }[]> = {};
  await Promise.all(
    paddyTypes.map(async (p) => {
      const historyRes = await apiFetchCached(`/api/admin/paddy-types/${p.id}/price-history/`, 300, ["paddy-types"]);
      priceHistory[p.id] = historyRes.ok ? await historyRes.json() : [];
    })
  );

  return <PricingManager paddyTypes={paddyTypes} priceHistory={priceHistory} canWrite={canWrite} />;
}
