/**
 * Route Handler: GET /api/admin/online-roles
 *
 * Authenticated proxy in front of Django's `OnlineRolesView`. Exists so the
 * dashboard can poll for live "who's online" counts from a Client
 * Component — a plain browser `fetch()` can't attach the httpOnly JWT
 * cookie to a cross-origin Django request, but it can hit this same-origin
 * route, which reads the cookie server-side via apiFetch() and forwards it
 * with the Bearer token attached.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

/**
 * Handles GET requests for the live per-role online-user breakdown.
 *
 * Authorization gate mirrors the admin overview page's `manage_users`
 * permission requirement, checked here directly (rather than via
 * lib/dal.ts's redirect-on-failure `requirePermission()`) since this is a
 * polled fetch that expects a plain HTTP status, not a redirect.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("manage_users")) {
    return new Response("Forbidden", { status: 403 });
  }

  const res = await apiFetch("/api/admin/overview/online/");
  if (!res.ok) {
    return new Response("Failed to load online users", { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
