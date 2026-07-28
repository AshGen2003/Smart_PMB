/**
 * `/licenses` — officer/admin review queue for authorized-purchaser and
 * mill-owner self-registrations. Requires `approve_licenses` — a
 * pre-seeded permission (see accounts/migrations/0003_role_permission.py)
 * already granted to admin + pmb_officer by default.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import LicensesManager, { type LicenseApplicationRow } from "./LicensesManager";

export default async function LicensesPage() {
  await requirePermission("approve_licenses");

  const res = await apiFetch("/api/admin/license-applications/");
  const applications: LicenseApplicationRow[] = res.ok ? await res.json() : [];

  return <LicensesManager applications={applications} />;
}
