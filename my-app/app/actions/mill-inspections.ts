/**
 * Server Action for the officer-side mill inspection log (see
 * (admin)/mill-licenses/InspectionsSection.tsx). Distinct from
 * actions/mill-licenses.ts, which governs License approval/rejection —
 * this instead records a point-in-time inspection visit, unrelated to the
 * license approval workflow.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

/** Logs a new inspection visit for a given mill. */
export async function logInspection(
  millId: number,
  result: "pass" | "fail" | "needs_follow_up",
  notes: string
): Promise<{ error?: string }> {
  const res = await apiFetch("/api/admin/mill-inspections/", {
    method: "POST",
    body: JSON.stringify({ mill: millId, result, notes }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/mill-licenses");
  return {};
}
