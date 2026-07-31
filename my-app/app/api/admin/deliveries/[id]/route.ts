/**
 * Route Handler: GET /api/admin/deliveries/[id]
 *
 * Authenticated proxy in front of Django's admin/deliveries/<id>/ endpoint,
 * used by the officer-side live-tracking modal to poll a delivery's
 * `latest_location` every few seconds. Exists for the same reason as
 * /api/driver/deliveries/[id]/location: a same-origin browser `fetch()`
 * can't attach the httpOnly JWT cookie to a cross-origin Django request, so
 * this route reads it server-side via apiFetch() and forwards it as a
 * Bearer token.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("manage_transport")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/api/admin/deliveries/${id}/`);
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
