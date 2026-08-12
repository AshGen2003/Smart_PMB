/**
 * Route Handler: GET /api/auth/me
 *
 * Authenticated proxy in front of the same live user data lib/dal.ts's
 * getCurrentUser() already reads server-side — exists so a Client
 * Component (TabActivityIndicator, for the "<page> — <role>" browser tab
 * title) can find out the current role without a plain browser fetch()
 * trying to attach the httpOnly JWT cookie to a cross-origin Django
 * request directly, same reasoning as /api/admin/online-roles. Returns
 * just the small subset actually needed client-side, not the full
 * AppUser shape.
 */
import { getCurrentUser } from "@/app/lib/dal";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ roleName: user.roleName });
}
