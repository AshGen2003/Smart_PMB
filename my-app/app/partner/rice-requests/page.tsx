/**
 * `/partner/rice-requests` — full rice request history for the logged-in
 * Authorized Purchaser, plus a form to submit a new request and a withdraw
 * action while it's still pending. Mirrors partner/licenses/page.tsx (the
 * mill-owner equivalent self-service page).
 */
import { apiFetch } from "@/app/lib/api";
import RiceRequestsManager, { type RiceRequestRow } from "./RiceRequestsManager";
import { type PaddyTypeOption } from "./RequestRiceForm";

export default async function PartnerRiceRequestsPage() {
  const [requestsRes, paddyTypesRes] = await Promise.all([
    apiFetch("/api/purchaser/requests/"),
    apiFetch("/api/admin/paddy-types/"),
  ]);

  const requests: RiceRequestRow[] = requestsRes.ok ? await requestsRes.json() : [];
  const paddyTypes: PaddyTypeOption[] = paddyTypesRes.ok ? await paddyTypesRes.json() : [];

  return <RiceRequestsManager requests={requests} paddyTypes={paddyTypes} />;
}
