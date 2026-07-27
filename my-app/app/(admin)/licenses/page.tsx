/**
 * `/licenses` — mill license application review queue. Viewable by anyone
 * with `monitor_operations` (read-only) or `approve_licenses` (full
 * read/write: approve, reject). Mirrors (admin)/approvals/page.tsx.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import LicensesManager, { type LicenseRow } from "./LicensesManager";

export default async function LicensesPage() {
  const user = await requireAnyPermission("monitor_operations", "approve_licenses");
  const canWrite = user.permissions.includes("approve_licenses") && !user.previewing;

  const res = await apiFetch("/api/admin/mill-licenses/");
  const licenses: LicenseRow[] = res.ok ? await res.json() : [];

  return <LicensesManager licenses={licenses} canWrite={canWrite} />;
}
