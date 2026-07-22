/**
 * Route Handler: GET /api/reports/admin-pdf
 *
 * Acts as an authenticated proxy in front of Django's admin governance PDF
 * report endpoint. If the browser linked directly to Django's URL, the
 * request wouldn't carry the httpOnly `access_token` cookie (client-side
 * navigation/`<a href>` can't attach it, and even if it could, it's scoped
 * to this Next.js app's origin, not Django's) — so instead the browser
 * downloads from this same-origin route, which reads the cookie
 * server-side via apiFetch(), forwards the request to Django with the
 * Bearer token attached, and streams the resulting PDF bytes back with a
 * download-triggering Content-Disposition header.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

/**
 * Handles GET requests for the admin governance report PDF.
 *
 * Authorization gate: requires a valid session AND the `manage_users`
 * permission — this mirrors whatever permission guards the admin page that
 * links to this download, so a user who can't see the report in-app can't
 * fetch it directly by URL either. Route Handlers don't go through
 * lib/dal.ts's `requirePermission()` (which redirects, appropriate for a
 * page render) — a fetch/download request should get a proper HTTP error
 * status instead of a redirect response.
 *
 * @returns 403 if unauthenticated or missing the permission; the upstream
 *   status if Django's PDF generation fails; otherwise a 200 response with
 *   `Content-Type: application/pdf` and a `Content-Disposition: attachment`
 *   header that makes the browser download it as
 *   "pmb-admin-report.pdf" rather than trying to navigate to it.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("manage_users")) {
    return new Response("Forbidden", { status: 403 });
  }

  const res = await apiFetch("/api/admin/reports/admin-summary/pdf/");
  if (!res.ok) {
    return new Response("Failed to generate report", { status: res.status });
  }

  // Buffer the whole PDF in memory before responding — simpler than piping
  // a stream through, and these reports are small enough that this isn't a
  // memory concern.
  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pmb-admin-report.pdf"',
    },
  });
}
