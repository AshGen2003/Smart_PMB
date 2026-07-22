/**
 * Route Handler: GET /api/messages/history
 *
 * Authenticated proxy in front of Django's paginated MessageHistoryView,
 * used by the full "Messages" page (behind the notification bell's "View
 * all" link). Forwards `page`/`unread` query params through unchanged. See
 * app/api/messages/inbox/route.ts for why a Client Component needs a
 * same-origin proxy rather than calling Django directly.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { search } = new URL(request.url);
  const res = await apiFetch(`/api/messages/history/${search}`);
  if (!res.ok) {
    return new Response("Failed to load messages", { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
