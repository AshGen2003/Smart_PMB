"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";

export async function markNotificationRead(notificationId: number) {
  await apiFetch(`/api/notifications/${notificationId}/read/`, {
    method: "POST",
  });
  revalidatePath("/farmer");
}
