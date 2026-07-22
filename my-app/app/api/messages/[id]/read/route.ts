/**
 * Route Handler: POST /api/messages/[id]/read
 *
 * Authenticated proxy in front of Django's MessageMarkReadView, used by the
 * notification bell to mark an item read. See
 * app/api/messages/inbox/route.ts for why a Client Component needs a
 * same-origin proxy rather than calling Django directly.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/api/messages/${id}/read/`, { method: "POST" });
  if (!res.ok) {
    return new Response("Failed to mark message read", { status: res.status });
  }

  return new Response(null, { status: 204 });
}
