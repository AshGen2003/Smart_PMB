/**
 * Route Handler: GET /api/messages/inbox
 *
 * Authenticated proxy in front of Django's MessageInboxView. Exists so the
 * notification bell (a Client Component) can poll for new messages — a
 * plain browser `fetch()` can't attach the httpOnly JWT cookie to a
 * cross-origin Django request, but it can hit this same-origin route,
 * which reads the cookie server-side via apiFetch() and forwards it with
 * the Bearer token attached.
 *
 * Never called while Portal Preview is active — see NotificationBell.tsx,
 * which shows a static placeholder instead of polling this endpoint during
 * preview, since the previewed role's inbox has no meaning for the real
 * admin's own JWT-authenticated account underneath.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await apiFetch("/api/messages/inbox/");
  if (!res.ok) {
    return new Response("Failed to load messages", { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
