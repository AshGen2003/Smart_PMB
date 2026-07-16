"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type ActionState = {
  error?: string;
};

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

export async function acknowledgeAlert(alertId: number): Promise<ActionState> {
  return alertAction(alertId, "acknowledge");
}

export async function resolveAlert(alertId: number): Promise<ActionState> {
  return alertAction(alertId, "resolve");
}

export async function runBackup(): Promise<ActionState> {
  const res = await apiFetch("/api/admin/backups/run/", { method: "POST" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Backup failed.") };
  }

  revalidatePath("/maintenance");
  return {};
}

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
