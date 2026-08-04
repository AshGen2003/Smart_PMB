/**
 * Route Handler: POST /api/messages/mark-all-read
 *
 * Authenticated proxy in front of Django's MessageMarkAllReadView, used by
 * the notification bell's "Mark all as read" button. See
 * app/api/messages/inbox/route.ts for why a Client Component needs a
 * same-origin proxy rather than calling Django directly.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await apiFetch("/api/messages/mark-all-read/", { method: "POST" });
  if (!res.ok) {
    return new Response("Failed to mark all messages read", { status: res.status });
  }

  return new Response(null, { status: 204 });
}
