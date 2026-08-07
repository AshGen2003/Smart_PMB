/**
 * `/mill-owner/licenses` — full license application history for the
 * logged-in mill owner, plus the ability to apply for a new one and
 * withdraw one while it's pending.
 */
import { apiFetch } from "@/app/lib/api";
import LicensesManager, { type LicenseRow } from "./LicensesManager";

export default async function MillOwnerLicensesPage() {
  const res = await apiFetch("/api/mill-owner/licenses/");
  const licenses: LicenseRow[] = res.ok ? await res.json() : [];

  return <LicensesManager licenses={licenses} />;
}
