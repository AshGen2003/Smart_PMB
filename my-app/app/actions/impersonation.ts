/**
 * Server Actions for real user impersonation — distinct from Portal Preview
 * (actions/preview.ts), which only ever shows sample data over the admin's
 * own real session. This actually swaps the browser's session to a real
 * JWT for the target user (see accounts/views.py's
 * AdminUserViewSet.impersonate), so the admin's original tokens must be
 * stashed first (lib/session.ts) and restored on exit.
 *
 * Starting a session now takes two steps, both gated by impersonate_users:
 * requestImpersonationOtp() emails the target account holder a one-time
 * code, and startImpersonation() only succeeds once that same code is
 * supplied back — the account holder has to actively hand it over, so
 * impersonation requires their in-the-moment consent rather than just an
 * admin's say-so.
 *
 * overrideImpersonation() is the break-glass exception: gated behind the
 * stronger override_impersonation_otp permission, it skips the code
 * entirely given a written reason, for accounts the holder genuinely can't
 * be reached to grant consent through.
 */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission, homeFor } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { verifyAccessToken } from "@/app/lib/jwt";
import {
  REFRESH_COOKIE,
  setTokenCookies,
  stashImpersonatorTokens,
  restoreImpersonatorTokens,
} from "@/app/lib/session";
import { firstErrorMessage } from "@/app/lib/errors";

/**
 * First step: emails the target account holder a one-time code they need
 * to relay back before startImpersonation() below will do anything.
 */
export async function requestImpersonationOtp(userId: string): Promise<{ error?: string; detail?: string }> {
  await requirePermission("impersonate_users");

  const res = await apiFetch(`/api/admin/users/${userId}/impersonate/request-otp/`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: firstErrorMessage(data, "Could not send the code.") };
  }
  return { detail: data.detail };
}

/**
 * Shared by startImpersonation and overrideImpersonation once the backend
 * has actually minted a token pair: stashes the admin's own tokens, swaps
 * in the target's, and redirects into that user's own portal, exactly like
 * a normal login would. Never returns on success (redirect() throws).
 */
async function completeImpersonation(access: string, refresh: string) {
  const payload = await verifyAccessToken(access);

  await stashImpersonatorTokens();
  await setTokenCookies(access, refresh);
  revalidatePath("/", "layout");

  const home = homeFor({ role: payload?.role ?? "" });
  // The query flag is a one-shot signal for ImpersonationBanner.tsx to pop
  // a confirmation toast on landing, then strip itself from the URL — the
  // persistent banner covers "this is still going on," this covers "this
  // just happened."
  const params = new URLSearchParams({ impersonation: "started" });
  if (payload?.email) params.set("as", payload.email);
  redirect(`${home}?${params.toString()}`);
}

/**
 * Second step: exchanges the account holder's relayed code for a real
 * token pair for the target (requires impersonate_users — requirePermission
 * redirects anyone else away before any of this runs), and redirects into
 * that user's own portal, exactly like a normal login would.
 */
export async function startImpersonation(userId: string, code: string): Promise<{ error?: string } | void> {
  await requirePermission("impersonate_users");

  const res = await apiFetch(`/api/admin/users/${userId}/impersonate/`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not start impersonation.") };
  }

  const { access, refresh } = await res.json();
  await completeImpersonation(access, refresh);
}

/**
 * Break-glass alternative to the two-step code flow above: signs in as the
 * target without a consent code, given a written reason, for accounts the
 * holder can't be reached to grant consent through. Requires the stronger
 * override_impersonation_otp permission — requirePermission redirects
 * anyone without it away before any of this runs.
 */
export async function overrideImpersonation(userId: string, reason: string): Promise<{ error?: string } | void> {
  await requirePermission("override_impersonation_otp");

  const res = await apiFetch(`/api/admin/users/${userId}/impersonate/override/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not override impersonation.") };
  }

  const { access, refresh } = await res.json();
  await completeImpersonation(access, refresh);
}

/**
 * Ends impersonation: blacklists the target's refresh token (mirrors
 * actions/auth.ts's logout() — without this, the freshly-minted session
 * from impersonate()/impersonate_override() would stay fully valid and
 * replayable for its whole natural lifetime, up to 7 days, even after the
 * admin believes they've "stopped"), then restores the admin's real
 * stashed tokens and returns to /users (the Users page impersonation is
 * started from) — same reasoning as exitPreview() returning to /preview
 * instead of /dashboard: an admin ending one impersonation is usually
 * about to start another (or just came from there), so this saves them
 * re-navigating back every time.
 */
export async function stopImpersonation() {
  const cookieStore = await cookies();
  const targetRefresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (targetRefresh) {
    await apiFetch("/api/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh: targetRefresh }),
    }).catch(() => {});
  }

  const restored = await restoreImpersonatorTokens();
  revalidatePath("/", "layout");
  redirect(restored ? "/users" : "/login");
}
