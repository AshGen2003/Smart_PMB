/**
 * `/system-requests/mine` — a PMB officer's own system-change requests.
 * Requires `request_system_changes`. The `payment` query param
 * (?payment=success|cancelled) is the Stripe Checkout redirect landing
 * here after the officer pays or cancels — it's UX-only (see
 * actions/systemRequests.ts's docstring): the actual status change to
 * "token_issued" only ever happens via the Stripe webhook, never trusted
 * from this redirect.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MyRequestsManager from "./MyRequestsManager";
import type { SystemRequestRow } from "../types";

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  await requirePermission("request_system_changes");
  const { payment } = await searchParams;

  // User-specific data — never cached (see lib/api.ts's apiFetch
  // docstring); the backend already scopes this to "requests I submitted"
  // for a non-admin caller.
  const res = await apiFetch("/api/system-requests/");
  const requests = res.ok ? ((await res.json()) as SystemRequestRow[]) : [];

  return (
    <MyRequestsManager
      requests={requests}
      paymentBanner={payment === "success" || payment === "cancelled" ? payment : null}
    />
  );
}
