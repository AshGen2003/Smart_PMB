/**
 * Invisible watchdog for the farmer portal (and any other non-admin/officer
 * shell) — the counterpart to IdleGuard, but deliberately does NOT log the
 * user out or navigate them anywhere after a period of inactivity. Farmers
 * should never be bounced to /login or another portal just for leaving a
 * tab open; instead this does a soft `router.refresh()` (re-fetches the
 * current Server Component's data in place, same URL, same user) so the
 * view doesn't go stale, then keeps watching in case the tab stays idle
 * for another full period.
 */
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_IDLE_MINUTES = 15;
const CHECK_INTERVAL_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/** Refreshes the current page in place after idleMinutes of inactivity, without logging out or redirecting. */
export default function IdleRefreshGuard({ idleMinutes }: { idleMinutes?: number }) {
  const router = useRouter();
  const lastActiveRef = useRef(0);
  const idleLimitMs = (idleMinutes ?? DEFAULT_IDLE_MINUTES) * 60 * 1000;

  useEffect(() => {
    lastActiveRef.current = Date.now();

    const markActive = () => {
      lastActiveRef.current = Date.now();
    };

    const checkIdle = () => {
      if (Date.now() - lastActiveRef.current >= idleLimitMs) {
        // Reset the clock first so a slow refresh (or the user staying
        // idle) doesn't trigger this again before the next full period.
        lastActiveRef.current = Date.now();
        router.refresh();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkIdle();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActive, { passive: true })
    );
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [idleLimitMs, router]);

  return null;
}
