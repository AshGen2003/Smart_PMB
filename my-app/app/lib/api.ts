/**
 * Core server-side HTTP client for talking to the Django REST Framework
 * backend ("Smart PMB" API).
 *
 * `apiFetch()` is the single place that knows how to authenticate a request:
 * it reads the httpOnly `access_token` cookie via `next/headers` and attaches
 * it as an `Authorization: Bearer <token>` header. Because it depends on
 * `next/headers`, it can only be called from server-side code that has
 * access to the incoming request — Server Components, Server Actions
 * ("use server" functions), and Route Handlers. It must never be imported
 * into a Client Component (that would fail at build/runtime since
 * `next/headers` has no meaning in the browser, and would also expose no
 * cookie to read anyway since httpOnly cookies aren't visible to
 * client-side JS).
 */
import { cookies } from "next/headers";

// Base URL of the Django backend, e.g. http://localhost:8000. Must be set at
// build/runtime — the non-null assertion documents that we treat a missing
// value as a configuration error rather than something to handle gracefully.
const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

/**
 * Makes an authenticated request to the Django API on behalf of the current
 * user.
 *
 * - Reads the `access_token` cookie set at login (see lib/session.ts) and,
 *   if present, attaches it as a `Bearer` token so Django's JWT auth can
 *   identify the caller. If there's no token (e.g. an anonymous request),
 *   the call still goes through without the header — callers that require
 *   auth should guard with lib/dal.ts helpers before calling this.
 * - Defaults the request body to JSON, except when the caller passes a
 *   `FormData` body (file uploads), in which case the browser/runtime needs
 *   to set its own `multipart/form-data` boundary in the Content-Type header.
 * - Disables Next.js's fetch cache (`cache: "no-store"`) by default because
 *   most responses are user-specific and often mutate server state; caching
 *   them would leak data between users or show stale results. Callers that
 *   explicitly opt in via `init.next` (see `apiFetchCached` below) keep
 *   their own caching options instead of being forced to `no-store`.
 *
 * @param path Path appended to the Django base URL, e.g. "/api/admin/users/".
 * @param init Standard fetch options (method, body, extra headers, etc.).
 * @returns The raw fetch Response — callers are responsible for checking
 *   `res.ok` and parsing the body themselves.
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  const headers = new Headers(init.headers);
  // Let fetch set the multipart boundary itself for FormData bodies —
  // forcing application/json would break file uploads.
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: init.next ? undefined : "no-store",
  });
}

/**
 * Cached variant of `apiFetch`, for read-only reference/lookup data that is
 * identical for every authorized caller — roles, warehouses, paddy types,
 * districts. These same lists get re-fetched from several different pages
 * (e.g. the warehouse list backs both /warehouses and the harvest form's
 * picker on /approvals), and each hit is a round-trip to a remote database,
 * so reusing one cached response across pages avoids paying that cost
 * repeatedly for data that rarely changes.
 *
 * Never use this for anything user-specific (profile, messages, dashboards,
 * the users list) — Next's Data Cache is keyed by URL only, not by which
 * user's Bearer token fetched it, so caching a personal response here would
 * serve one user's data to another.
 *
 * `revalidate` is a time-based safety net; pair `tags` with a
 * `revalidateTag()` call in whichever Server Action mutates the same
 * resource so edits show up immediately instead of waiting it out.
 */
export async function apiFetchCached(path: string, revalidate: number, tags: string[]) {
  return apiFetch(path, { next: { revalidate, tags } });
}
