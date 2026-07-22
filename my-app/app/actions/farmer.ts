/**
 * Server Actions for the farmer self-service portal. Currently just
 * notification handling — actions that let a farmer manage their own
 * in-app notifications (as opposed to admin-side actions in the other
 * files under app/actions/).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";

/**
 * Marks a single notification as read for the current farmer.
 *
 * Ignores the response status rather than returning a FormState/error —
 * this is meant to be a low-stakes, fire-and-forget UI action (e.g.
 * triggered by opening a notification), so a failure here doesn't need to
 * interrupt the user with an error message.
 *
 * @param notificationId ID of the notification to mark as read.
 */
export async function markNotificationRead(notificationId: number) {
  await apiFetch(`/api/notifications/${notificationId}/read/`, {
    method: "POST",
  });
  // Refresh the farmer portal so the notification's read/unread state
  // (and any unread-count badge) reflects the change.
  revalidatePath("/farmer");
}
