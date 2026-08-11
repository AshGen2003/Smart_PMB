/**
 * `/dispatch-manifests` — Authorized Purchasers' dispatch-manifest review
 * queue. Viewable by anyone with `monitor_operations` (read-only) or
 * `record_purchases` (full read/write: approve, reject). Mirrors
 * (admin)/purchase-requests/page.tsx.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import DispatchManifestsManager, { type DispatchManifestRow } from "./DispatchManifestsManager";

export default async function DispatchManifestsPage() {
  const user = await requireAnyPermission("monitor_operations", "record_purchases");
  const canWrite = user.permissions.includes("record_purchases") && !user.previewing;

  const res = await apiFetch("/api/admin/dispatch-manifests/");
  const manifests: DispatchManifestRow[] = res.ok ? await res.json() : [];

  return <DispatchManifestsManager manifests={manifests} canWrite={canWrite} />;
}
