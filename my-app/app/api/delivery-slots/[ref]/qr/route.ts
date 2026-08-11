/**
 * Route Handler: GET /api/delivery-slots/[ref]/qr
 *
 * Authenticated proxy in front of Django's DeliverySlotQrView — mirrors
 * /api/backups/[id]/download/route.ts's proxy pattern (a same-origin proxy
 * is needed since the browser can't attach the httpOnly auth cookie to a
 * direct <img> pointed at the Django backend). Django itself re-checks that
 * the caller is either the booking's own farmer or the warehouse's manager,
 * so this just forwards the request and whatever status it comes back with.
 */
import { apiFetch } from "@/app/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const res = await apiFetch(`/api/delivery-slots/${ref}/qr.png`);
  if (!res.ok) {
    return new Response(null, { status: res.status });
  }

  const image = await res.arrayBuffer();
  return new Response(image, { headers: { "Content-Type": "image/png" } });
}
