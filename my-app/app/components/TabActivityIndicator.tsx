/**
 * Mounted once in the root layout — two independent pieces of browser-tab
 * chrome, not any in-page UI:
 *
 * 1. Title becomes "<Page> — <Role>" (just "<Page>" while logged out or
 *    before the role loads), so multiple open tabs for different
 *    accounts/roles are distinguishable at a glance.
 * 2. Favicon becomes a spinning brand-colored ring while there's a reason
 *    to think something's happening — two independent triggers, either
 *    one is enough to spin it:
 *      a. Real network activity in flight. Page navigations, Server
 *         Action submits, and every apiFetch call to the backend all go
 *         through the browser's own fetch() under the hood — patching it
 *         once here catches all of them centrally, instead of wiring a
 *         "start/stop loading" call into every individual button and form
 *         across the app. Next.js's own background route prefetching
 *         (fetched ahead of a <Link> entering the viewport, not something
 *         the user actually clicked) is deliberately excluded via its
 *         next-router-prefetch header — otherwise the icon would spin
 *         from passive scrolling instead of only real actions.
 *      b. Any <button> click anywhere on the page, for a fixed short
 *         pulse — covers the many buttons that don't cause a fetch at all
 *         (e.g. an in-app tab switcher that's just local React state), so
 *         clicking still gets an immediate reaction even when there's
 *         nothing to actually wait for.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function prettifyPathname(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const lastSegment = pathname.replace(/^\//, "").split("/").filter(Boolean).pop() ?? "";
  return lastSegment
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildSpinnerFaviconHref(): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><style>.s{transform-origin:center;animation:pmbspin .8s linear infinite}@keyframes pmbspin{to{transform:rotate(360deg)}}</style><circle class='s' cx='12' cy='12' r='9' fill='none' stroke='#1e5128' stroke-width='3' stroke-linecap='round' stroke-dasharray='42 14'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SPINNER_FAVICON_HREF = buildSpinnerFaviconHref();
let originalFaviconHref: string | null = null;

function getFaviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

// Module-level (not component state) so the fetch patch is installed
// exactly once for the page's lifetime, immune to this component
// remounting (e.g. React Strict Mode's dev-only double-invoke).
let fetchPatched = false;
let activeRequestCount = 0;
let notifyActivityChange: ((active: boolean) => void) | null = null;

function isBackgroundPrefetch(input: RequestInfo | URL, init: RequestInit | undefined): boolean {
  const initHeaders = init?.headers;
  const requestHeaders = typeof input === "object" && input !== null && "headers" in input ? (input as Request).headers : undefined;
  const headers = new Headers(initHeaders ?? requestHeaders);
  return headers.has("next-router-prefetch");
}

function installFetchActivityPatch() {
  if (fetchPatched) return;
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (isBackgroundPrefetch(input, init)) {
      return originalFetch(input, init);
    }
    activeRequestCount++;
    if (activeRequestCount === 1) notifyActivityChange?.(true);
    try {
      return await originalFetch(input, init);
    } finally {
      activeRequestCount--;
      if (activeRequestCount === 0) notifyActivityChange?.(false);
    }
  }) as typeof window.fetch;
}

// How long a single button click keeps the favicon spinning on its own,
// independent of whether that click triggered any real network activity.
const CLICK_PULSE_MS = 600;

export default function TabActivityIndicator() {
  const pathname = usePathname();
  const [roleName, setRoleName] = useState<string | null>(null);
  const [fetchActive, setFetchActive] = useState(false);
  const [clickActive, setClickActive] = useState(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = fetchActive || clickActive;

  // Fetch the current role once — it doesn't change mid-session, and this
  // component stays mounted across client-side navigations (it lives in
  // the root layout, outside every route's own tree).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.roleName) setRoleName(data.roleName);
      })
      .catch(() => {
        // Logged out, or a transient hiccup — title just falls back to
        // the page name alone, no error surfaced.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    notifyActivityChange = setFetchActive;
    installFetchActivityPatch();
    const link = getFaviconLink();
    if (originalFaviconHref === null) originalFaviconHref = link.href;
    return () => {
      notifyActivityChange = null;
    };
  }, []);

  // Any button/tab click gives the favicon a brief, fixed pulse of its
  // own — many "tabs" in this app (e.g. Transportation's Vehicles/Routes/
  // Deliveries switcher) are just local state with no fetch behind them
  // at all, so the fetch-patch above alone wouldn't react to those.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button")) return;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      setClickActive(true);
      clickTimeoutRef.current = setTimeout(() => setClickActive(false), CLICK_PULSE_MS);
    }
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const link = getFaviconLink();
    link.href = active ? SPINNER_FAVICON_HREF : originalFaviconHref ?? "/favicon.ico";
  }, [active]);

  useEffect(() => {
    const pageLabel = prettifyPathname(pathname);
    document.title = roleName ? `${pageLabel} — ${roleName}` : pageLabel;
  }, [pathname, roleName]);

  return null;
}
