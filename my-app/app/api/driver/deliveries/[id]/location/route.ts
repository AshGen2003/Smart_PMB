/**
 * Route Handler: POST /api/driver/deliveries/[id]/location
 *
 * Authenticated proxy in front of Django's DeliveryLocationPingView. Exists
 * so the driver's browser (a Client Component using the Geolocation API)
 * can report its position without a full page navigation/Server Action
 * round-trip — a plain browser `fetch()` can't attach the httpOnly JWT
 * cookie to a cross-origin Django request, but it can hit this same-origin
 * route, which reads the cookie server-side via apiFetch() and forwards it
 * with the Bearer token attached.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = await request.text();
  const res = await apiFetch(`/api/driver/deliveries/${id}/location/`, {
    method: "POST",
    body,
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
