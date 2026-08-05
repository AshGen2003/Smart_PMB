/**
 * Manages a WebSocket connection to the real-time notification push
 * endpoint (see Smart_pmb_backend/pmb_bk/notifications/consumers.py),
 * used by NotificationBell.tsx to deliver new messages instantly instead
 * of waiting for its fallback poll. Reconnects automatically with
 * exponential backoff if the connection ever drops.
 */
"use client";

import { useEffect, useRef } from "react";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function wsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/notifications/`;
}

/**
 * @param enabled Whether the socket should be open at all right now
 *   (mirrors the same gating NotificationBell.tsx already applies to its
 *   fallback poll — e.g. skipped during Portal Preview).
 * @param onMessage Called with each parsed JSON payload the server pushes.
 */
export function useNotificationSocket<T>(enabled: boolean, onMessage: (message: T) => void) {
  // Keeps the effect below from needing onMessage in its dependency array
  // (it's typically a fresh closure every render), without re-opening the
  // socket every time the caller's callback identity changes.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      socket = new WebSocket(wsUrl());

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch {
          // Malformed frame — ignore, next one will still arrive fine.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        const base = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
        const delay = base * (0.5 + Math.random() * 0.5); // 50-100% jitter avoids a reconnect thundering herd
        attempt += 1;
        timer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    };
  }, [enabled]);
}
