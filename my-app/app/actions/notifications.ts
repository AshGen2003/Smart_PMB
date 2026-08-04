/**
 * Server Action backing the Settings → Notifications card. Reuses the same
 * "/me/" PATCH endpoint as actions/profile.ts, just with a different slice
 * of fields — `notify_harvest_updates`/`notify_via_sms` are silently ignored
 * server-side for anyone without a farmer profile, so it's safe to always
 * send all three.
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type NotificationPreferencesState = {
  error?: string;
  success?: string;
};

/**
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Checkbox fields: notify_in_app_messages, and (farmers
 *   only) notify_harvest_updates, notify_via_sms. An absent checkbox means "off".
 * @returns `{ error }` on failure, or `{ success }` once saved.
 */
export async function updateNotificationPreferences(
  _prevState: NotificationPreferencesState,
  formData: FormData
): Promise<NotificationPreferencesState> {
  const payload = {
    notify_in_app_messages: formData.get("notify_in_app_messages") === "on",
    notify_harvest_updates: formData.get("notify_harvest_updates") === "on",
    notify_via_sms: formData.get("notify_via_sms") === "on",
  };

  const res = await apiFetch("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not update your notification preferences.") };
  }

  revalidatePath("/settings");
  revalidatePath("/farmer/settings");
  revalidatePath("/driver/settings");
  return { success: "Notification preferences saved." };
}
