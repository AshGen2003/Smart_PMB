/**
 * Server Actions for the system maintenance / "sysops" area: acknowledging
 * or resolving system alerts, triggering an on-demand backup, and editing
 * global system configuration. These all target the "/maintenance" admin
 * page.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type ActionState = {
  error?: string;
};

// Shared implementation for the two alert status-transition endpoints
// (acknowledge/resolve) — identical apart from the URL segment, so the
// exported wrappers below just supply the action name.
async function alertAction(alertId: number, action: "acknowledge" | "resolve") {
  const res = await apiFetch(`/api/admin/alerts/${alertId}/${action}/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/maintenance");
  return {};
}

/** Marks a system alert as acknowledged (seen, but not yet resolved). */
export async function acknowledgeAlert(alertId: number): Promise<ActionState> {
  return alertAction(alertId, "acknowledge");
}

/** Marks a system alert as resolved. */
export async function resolveAlert(alertId: number): Promise<ActionState> {
  return alertAction(alertId, "resolve");
}

/**
 * Triggers an on-demand system backup on the Django side. Takes no
 * arguments — it's invoked directly (e.g. from a button's onClick calling
 * a wrapping function), not bound to a `<form>`.
 *
 * @returns `{ error }` (with a "Backup failed." fallback message) if the
 *   backup couldn't be started, otherwise `{}` after revalidating
 *   "/maintenance" so the backup history/status updates.
 */
export async function runBackup(): Promise<ActionState> {
  const res = await apiFetch("/api/admin/backups/run/", { method: "POST" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Backup failed.") };
  }

  revalidatePath("/maintenance");
  return {};
}

/**
 * Patches one or more global system configuration values (e.g. feature
 * flags, thresholds) — a plain key/value record rather than a FormData
 * payload, since the calling UI is expected to build the update object
 * itself rather than reading a raw `<form>` submission.
 *
 * @param updates Partial map of config keys to their new string values.
 * @returns `{ error }` on failure. On success, revalidates "/maintenance"
 *   plus the root layout — some config values (e.g. site-wide settings)
 *   can affect what renders outside the maintenance page itself, so the
 *   whole layout is invalidated to be safe.
 */
export async function updateSystemConfig(
  updates: Record<string, string>
): Promise<ActionState> {
  const res = await apiFetch("/api/admin/system-config/", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/maintenance");
  revalidatePath("/", "layout");
  return {};
}
