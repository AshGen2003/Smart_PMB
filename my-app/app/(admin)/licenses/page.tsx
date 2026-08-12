/**
 * `/licenses` — combined "License" page: account-approval applications for
 * both authorized-purchaser and mill-owner self-registrations, plus the
 * ongoing per-mill operating license queue and inspection log (formerly the
 * separate `/mill-licenses` page — merged into a single tabbed page; see
 * LicenseTabs.tsx). Viewable by anyone with `monitor_operations`
 * (read-only) or `approve_licenses` (full read/write).
 */
import { requireAnyPermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import LicenseTabs from "./LicenseTabs";
import type { LicenseApplicationRow } from "./LicensesManager";
import type { LicenseRow } from "../mill-licenses/LicensesManager";
import type { InspectionRow, MillOption } from "../mill-licenses/InspectionsSection";

export default async function LicensesPage() {
  const user = await requireAnyPermission("monitor_operations", "approve_licenses");
  const canWrite = user.permissions.includes("approve_licenses") && !user.previewing;

  const [applicationsRes, millLicensesRes, inspectionsRes, millsRes] = await Promise.all([
    apiFetch("/api/admin/license-applications/"),
    apiFetch("/api/admin/mill-licenses/"),
    apiFetch("/api/admin/mill-inspections/"),
    canWrite ? apiFetch("/api/admin/mills/") : Promise.resolve(null),
  ]);

  const applications: LicenseApplicationRow[] = applicationsRes.ok ? await applicationsRes.json() : [];
  const millLicenses: LicenseRow[] = millLicensesRes.ok ? await millLicensesRes.json() : [];
  const inspections: InspectionRow[] = inspectionsRes.ok ? await inspectionsRes.json() : [];
  const mills: MillOption[] = millsRes?.ok ? await millsRes.json() : [];

  return (
    <LicenseTabs
      applications={applications}
      millLicenses={millLicenses}
      inspections={inspections}
      mills={mills}
      canWrite={canWrite}
    />
  );
}
