/**
 * `/system-requests` — admin review queue ("waiting list") for PMB
 * officers' system-change requests. Requires `manage_system_requests`.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import SystemRequestsManager from "./SystemRequestsManager";
import type { SystemRequestRow } from "./types";

export default async function SystemRequestsPage() {
  await requirePermission("manage_system_requests");

  // User-specific/queue data — never cached (see lib/api.ts's apiFetch
  // docstring), the backend already scopes this to "every request" for an
  // admin caller.
  const res = await apiFetch("/api/system-requests/");
  const requests = res.ok ? ((await res.json()) as SystemRequestRow[]) : [];

  return <SystemRequestsManager requests={requests} />;
}
