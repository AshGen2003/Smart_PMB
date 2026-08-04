/**
 * Server Actions for real user impersonation — distinct from Portal Preview
 * (actions/preview.ts), which only ever shows sample data over the admin's
 * own real session. This actually swaps the browser's session to a real
 * JWT for the target user (see accounts/views.py's
 * AdminUserViewSet.impersonate), so the admin's original tokens must be
 * stashed first (lib/session.ts) and restored on exit.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { verifyAccessToken } from "@/app/lib/jwt";
import {
  setTokenCookies,
  stashImpersonatorTokens,
  restoreImpersonatorTokens,
} from "@/app/lib/session";
import { firstErrorMessage } from "@/app/lib/errors";

/**
 * Starts impersonating the given user: stashes the admin's current tokens,
 * exchanges them for a real token pair for the target (requires
 * impersonate_users — requirePermission redirects anyone else away before
 * any of this runs), and redirects into that user's own portal, exactly
 * like a normal login would.
 */
export async function startImpersonation(userId: string): Promise<{ error?: string } | void> {
  await requirePermission("impersonate_users");

  const res = await apiFetch(`/api/admin/users/${userId}/impersonate/`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not start impersonation.") };
  }

  const { access, refresh } = await res.json();
  const payload = await verifyAccessToken(access);

  await stashImpersonatorTokens();
  await setTokenCookies(access, refresh);
  revalidatePath("/", "layout");

  // Same role -> home-route mapping as actions/auth.ts's login().
  const home =
    payload?.role === "farmer"
      ? "/farmer"
      : payload?.role === "driver"
      ? "/driver"
      : payload?.role === "warehouse_manager"
      ? "/warehouse-manager"
      : payload?.role === "pmb_officer"
      ? "/officer"
      : payload?.role === "authorized_purchaser" || payload?.role === "mill_owner"
      ? "/partner"
      : "/dashboard";
  // The query flag is a one-shot signal for ImpersonationBanner.tsx to pop
  // a confirmation toast on landing, then strip itself from the URL — the
  // persistent banner covers "this is still going on," this covers "this
  // just happened."
  const params = new URLSearchParams({ impersonation: "started" });
  if (payload?.email) params.set("as", payload.email);
  redirect(`${home}?${params.toString()}`);
}

/**
 * Ends impersonation: restores the admin's real stashed tokens and returns
 * to /residents (the Users page impersonation is started from) — same
 * reasoning as exitPreview() returning to /preview instead of /dashboard:
 * an admin ending one impersonation is usually about to start another (or
 * just came from there), so this saves them re-navigating back every time.
 * Only the *start* of impersonation is server-audited (see the backend
 * action) — ending it is just restoring cookies, not a new privileged
 * action, so no extra backend call is made here.
 */
export async function stopImpersonation() {
  const restored = await restoreImpersonatorTokens();
  revalidatePath("/", "layout");
  redirect(restored ? "/residents" : "/login");
}
