/**
 * Mounted once in the root layout — periodically calls router.refresh() so
 * every page picks up backend-side changes (a Stripe webhook issuing a
 * token, a driver accepting/rejecting a delivery, another user editing
 * something) without anyone having to manually reload. router.refresh()
 * re-fetches Server Component data for the current route only; per Next's
 * own docs it merges the result without losing client-side React state
 * (useState, open dropdowns) or scroll position, so this is safe to fire
 * repeatedly in the background.
 *
 * Skipped while the tab is hidden (nothing to refresh if it isn't visible)
 * and while a text input/textarea/select/contenteditable is focused, so a
 * periodic refresh can never interrupt someone mid-form-fill — the next
 * tick after they're done picks it back up.
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 15000;

function isEditingSomething(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

export default function AutoRefresh() {
  const router = useRouter();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    function refreshIfSafe() {
      if (document.visibilityState !== "visible") return;
      if (isEditingSomething()) return;
      lastRefreshRef.current = Date.now();
      router.refresh();
    }

    const intervalId = setInterval(refreshIfSafe, REFRESH_INTERVAL_MS);

    // Coming back to the tab after a while shouldn't wait for the next
    // scheduled tick — but skip it if a tick only just fired.
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;
      refreshIfSafe();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
