/**
 * Cookie helpers for the two auth tokens issued by Django: a short-lived
 * access token and a longer-lived refresh token. These are the only two
 * functions that write/clear the auth cookies, so any change to cookie
 * flags or lifetimes belongs here. Reading the access token happens
 * elsewhere (lib/api.ts, lib/dal.ts) directly via `cookies().get(...)`.
 *
 * Like lib/api.ts, this relies on `next/headers` and can only run in
 * server-side code (Server Actions / Route Handlers) — `cookies().set()`
 * and `.delete()` specifically require a Server Action or Route Handler
 * context, since Next.js won't let you mutate cookies while just rendering
 * a Server Component.
 */
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

// Shared flags for both auth cookies:
// - httpOnly: blocks client-side JS (document.cookie) from ever reading the
//   token, which is why apiFetch() must run server-side to attach it.
// - secure: only sent over HTTPS, but relaxed in non-production so local
//   http://localhost development still works.
// - sameSite: "lax" allows the cookie on normal top-level navigations
//   (e.g. following a link or redirect) while still blocking it on
//   cross-site subrequests, a reasonable default CSRF mitigation for a
//   same-site app like this one.
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Sets the access and refresh token cookies after a successful login or
 * token refresh.
 *
 * The access token is short-lived (15 minutes) since it's presented on
 * every API call and carries the user's permissions — keeping its window
 * small limits how long a leaked token stays useful. The refresh token
 * lives much longer (7 days) so the user isn't forced to log in again
 * every 15 minutes; it's only ever sent to the token-refresh endpoint.
 *
 * @param access Raw JWT access token returned by Django.
 * @param refresh Raw refresh token returned by Django.
 */
export async function setTokenCookies(access: string, refresh: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, access, { ...cookieOpts, maxAge: 60 * 15 });
  cookieStore.set(REFRESH_COOKIE, refresh, {
    ...cookieOpts,
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Removes both auth cookies, effectively logging the browser out locally.
 * Does not talk to Django — callers that need to invalidate the refresh
 * token server-side (e.g. actions/auth.ts `logout()`) must do that
 * separately before/alongside calling this.
 */
export async function clearTokenCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
