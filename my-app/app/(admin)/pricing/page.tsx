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
import { apiFetch } from "@/app/lib/api";
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

  const res = await apiFetch("/api/admin/paddy-types/");
  const paddyTypes = res.ok ? ((await res.json()) as PaddyTypeRow[]) : [];

  return <PricingManager paddyTypes={paddyTypes} canWrite={canWrite} />;
}
