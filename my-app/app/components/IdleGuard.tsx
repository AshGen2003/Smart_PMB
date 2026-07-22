/**
 * Watchdog component mounted inside AdminShell that automatically logs the
 * user out after a period of inactivity, redirecting to /login. Listens for
 * mouse/keyboard/click/scroll/touch activity to reset an idle timer, and
 * ticks every second to both check for expiry and drive a visible warning
 * countdown in the last WARNING_SECONDS before the actual logout — so a
 * forced logout is never a silent surprise. `idleMinutes` is driven by the
 * admin-configurable SystemConfig value.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import styles from "./IdleGuard.module.css";

// Falls back to the access token's default lifetime (see setTokenCookies in
// app/lib/session.ts) if the admin hasn't configured a value yet.
const DEFAULT_IDLE_MINUTES = 15;
const TICK_MS = 1000;
const WARNING_SECONDS = 60; // show the countdown for the last minute before logout
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/** Tracks last-activity time via event listeners, shows a countdown warning in the last WARNING_SECONDS, and force-logs-out the user once idleMinutes has elapsed. */
export default function IdleGuard({ idleMinutes }: { idleMinutes?: number }) {
  const lastActiveRef = useRef(0);
  const loggingOutRef = useRef(false);
  const idleLimitMs = (idleMinutes ?? DEFAULT_IDLE_MINUTES) * 60 * 1000;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    lastActiveRef.current = Date.now();

    const markActive = () => {
      lastActiveRef.current = Date.now();
      // Any real activity (including clicking "Stay signed in" below, since
      // that click is itself an activity event) dismisses the warning.
      setSecondsLeft(null);
    };

    const tick = () => {
      if (loggingOutRef.current) return;
      const remainingMs = idleLimitMs - (Date.now() - lastActiveRef.current);

      if (remainingMs <= 0) {
        loggingOutRef.current = true;
        setSecondsLeft(0);
        // logout() clears cookies + blacklists the refresh token server-side,
        // then redirect()s to /login — a hard session end, not just a client redirect.
        logout();
        return;
      }

      setSecondsLeft(remainingMs <= WARNING_SECONDS * 1000 ? Math.ceil(remainingMs / 1000) : null);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActive, { passive: true })
    );
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(tick, TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [idleLimitMs]);

  if (secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className={styles.overlay} role="alertdialog" aria-live="assertive">
      <div className={styles.card}>
        <div className={styles.icon}>
          <LogOut size={22} />
        </div>
        <h2 className={styles.title}>You&apos;ll be logged out soon</h2>
        <p className={styles.message}>
          You&apos;ve been inactive for a while. For your security, you&apos;ll be signed out in:
        </p>
        <div className={styles.timer}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
        <button
          type="button"
          className={styles.stayBtn}
          onClick={() => {
            lastActiveRef.current = Date.now();
            setSecondsLeft(null);
          }}
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
