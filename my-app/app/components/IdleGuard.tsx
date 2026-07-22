/**
 * Invisible watchdog component (renders nothing) mounted inside AdminShell
 * that automatically logs the user out after a period of inactivity.
 * Listens for mouse/keyboard/click/scroll/touch activity to reset an
 * idle timer, and periodically checks whether the timer has expired —
 * including when the tab regains visibility after being backgrounded.
 * `idleMinutes` is driven by the admin-configurable SystemConfig value.
 */
"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/app/actions/auth";

// Falls back to the access token's default lifetime (see setTokenCookies in
// app/lib/session.ts) if the admin hasn't configured a value yet.
const DEFAULT_IDLE_MINUTES = 15;
const CHECK_INTERVAL_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/** Tracks last-activity time via event listeners and force-logs-out the user once idleMinutes has elapsed. */
export default function IdleGuard({ idleMinutes }: { idleMinutes?: number }) {
  const lastActiveRef = useRef(0);
  const loggingOutRef = useRef(false);
  const idleLimitMs = (idleMinutes ?? DEFAULT_IDLE_MINUTES) * 60 * 1000;

  useEffect(() => {
    lastActiveRef.current = Date.now();

    const markActive = () => {
      lastActiveRef.current = Date.now();
    };

    const checkIdle = () => {
      if (loggingOutRef.current) return;
      if (Date.now() - lastActiveRef.current >= idleLimitMs) {
        loggingOutRef.current = true;
        // logout() clears cookies + blacklists the refresh token server-side,
        // then redirect()s to /login — a hard session end, not just a client redirect.
        logout();
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
  }, [idleLimitMs]);

  return null;
}
