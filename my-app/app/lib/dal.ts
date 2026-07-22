/**
 * Data Access Layer (DAL) for authentication and authorization.
 *
 * This is the main gate that protected Server Component pages call through
 * before rendering anything sensitive. Rather than sprinkling ad-hoc cookie
 * checks across pages, every protected route calls one of the `require*`
 * functions here, which either returns the authenticated user or redirects
 * away — so a page body can assume "if this line runs, the user is allowed
 * to be here."
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "./jwt";

// The application's view of "who is logged in", derived from the JWT
// payload. Kept separate from AccessTokenPayload (lib/jwt.ts) so callers
// work with friendly camelCase field names instead of the raw token shape.
export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  roleName: string;
  permissions: string[];
};

/**
 * Resolves the current request's authenticated user, or `null` if there is
 * no valid session.
 *
 * Wrapped in React's `cache()` so that multiple calls during the same
 * request/render (e.g. from a layout and several nested Server Components)
 * only verify the JWT once instead of repeating the crypto work — the
 * result is NOT cached across requests, just de-duplicated within one.
 *
 * Verifies the Django-issued JWT signature/expiry itself on every call
 * (via verifyAccessToken) rather than just trusting that a cookie is
 * present — a cookie could be expired, tampered with, or signed with an
 * old key, so presence alone isn't proof of a valid session.
 *
 * @returns The current AppUser, or `null` if there's no cookie or the
 *   token fails verification.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    fullName: payload.full_name || null,
    role: payload.role,
    roleName: payload.role_name,
    permissions: payload.permissions ?? [],
  };
});

/**
 * Ensures a request has an authenticated user, redirecting to `/login` if
 * not. This is the base building block every other `require*` helper below
 * calls first — it guarantees "logged in" before those layer on "and has
 * this role/permission."
 *
 * @returns The authenticated AppUser. Never returns null — on failure it
 *   throws via `redirect()` (Next.js implements redirects by throwing a
 *   special error that the framework catches), so code after the call can
 *   assume a real user.
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Where to send a user who is logged in but not allowed on the page they
// requested — their own dashboard, rather than a generic error page.
function homeFor(user: AppUser): string {
  return user.role === "farmer" ? "/farmer" : "/dashboard";
}

/**
 * Ensures the current user is authenticated AND has the exact given role
 * (e.g. "farmer"). Logged-in users of the wrong role are bounced to their
 * own home page rather than shown the page they were denied.
 *
 * @param role The required role key, matched against `AppUser.role`.
 * @returns The authenticated, role-matching AppUser.
 */
export async function requireRole(role: string): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) {
    // Send them to their own home, not the page they were denied.
    redirect(homeFor(user));
  }
  return user;
}

/**
 * Ensures the current user is authenticated AND holds a specific
 * permission codename (as granted by their role — see actions/roles.ts).
 * This is the primary authorization check used by admin/officer pages,
 * e.g. `requirePermission("manage_users")`.
 *
 * @param codename Permission codename to check for, matching the strings
 *   returned in the JWT's `permissions` claim.
 * @returns The authenticated, authorized AppUser.
 */
export async function requirePermission(codename: string): Promise<AppUser> {
  const user = await requireUser();
  if (!user.permissions.includes(codename)) {
    redirect(homeFor(user));
  }
  return user;
}

/**
 * Like requirePermission, but passes if the user holds ANY one of several
 * permissions — useful for pages that multiple different roles should be
 * able to reach (e.g. a report viewable by either "view_reports" or
 * "manage_users" holders).
 *
 * @param codenames One or more permission codenames; the user needs at
 *   least one of them.
 * @returns The authenticated, authorized AppUser.
 */
export async function requireAnyPermission(...codenames: string[]): Promise<AppUser> {
  const user = await requireUser();
  if (!codenames.some((c) => user.permissions.includes(c))) {
    redirect(homeFor(user));
  }
  return user;
}
