/**
 * `/mill-licenses` — ongoing per-mill operating license review queue
 * (renewable, expiry-tracked — see mills/models.py's License). Distinct
 * from `/licenses`, the one-time account-approval gate for new purchaser/
 * mill-owner accounts (see accounts/models.py's LicenseApplication).
 * Viewable by anyone with `monitor_operations` (read-only) or
 * `approve_licenses` (full read/write: approve, reject). Mirrors
 * (admin)/approvals/page.tsx.
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import LicensesManager, { type LicenseRow } from "./LicensesManager";
import InspectionsSection, { type InspectionRow, type MillOption } from "./InspectionsSection";

export default async function LicensesPage() {
  const user = await requireAnyPermission("monitor_operations", "approve_licenses");
  const canWrite = user.permissions.includes("approve_licenses") && !user.previewing;

  const [licensesRes, inspectionsRes, millsRes] = await Promise.all([
    apiFetch("/api/admin/mill-licenses/"),
    apiFetch("/api/admin/mill-inspections/"),
    canWrite ? apiFetch("/api/admin/mills/") : Promise.resolve(null),
  ]);
  const licenses: LicenseRow[] = licensesRes.ok ? await licensesRes.json() : [];
  const inspections: InspectionRow[] = inspectionsRes.ok ? await inspectionsRes.json() : [];
  const mills: MillOption[] = millsRes?.ok ? await millsRes.json() : [];

  return (
    <>
      <LicensesManager licenses={licenses} canWrite={canWrite} />
      <InspectionsSection inspections={inspections} mills={mills} canWrite={canWrite} />
    </>
  );
}
