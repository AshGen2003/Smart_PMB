/**
 * Route Handler: POST /api/messages
 *
 * Authenticated proxy in front of Django's MessageCreateView, used by the
 * notification bell's compose box. See app/api/messages/inbox/route.ts for
 * why a Client Component needs a same-origin proxy rather than calling
 * Django directly.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Portal Preview is always read-only — never let a preview session
  // actually send a message from the real admin's account.
  if (user.previewing) {
    return new Response("Not available while previewing", { status: 403 });
  }

  const body = await request.text();
  const res = await apiFetch("/api/messages/", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
