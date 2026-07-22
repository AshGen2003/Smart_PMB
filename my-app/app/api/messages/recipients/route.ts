/**
 * Route Handler: GET /api/messages/recipients
 *
 * Authenticated proxy in front of Django's MessageRecipientsView, used to
 * populate the notification bell's "message a user" picker for staff
 * accounts. See app/api/messages/inbox/route.ts for why a Client Component
 * needs a same-origin proxy rather than calling Django directly.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await apiFetch("/api/messages/recipients/");
  if (!res.ok) {
    return new Response("Failed to load recipients", { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
