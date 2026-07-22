/**
 * Live "who's online right now" card for the admin dashboard: total online
 * count plus a per-role breakdown, each polled from
 * `/api/admin/online-roles` (a proxy in front of Django's OnlineRolesView)
 * every few seconds so the numbers update without a page refresh.
 *
 * Client Component: needs `useEffect`/`setInterval` for polling, so it
 * can't be a Server Component like the rest of the dashboard's initial
 * data fetch.
 */
"use client";

import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";

type OnlineRolesData = {
  online_total: number;
  roles: { name: string; slug: string; count: number }[];
};

// Same fixed palette used for the "Role Distribution" pie/tables elsewhere
// on this dashboard, so a role's color means the same thing everywhere.
const ROLE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-neutral)",
];

const POLL_INTERVAL_MS = 10_000;

/** Renders the live online-user-by-role card, polling for fresh counts every POLL_INTERVAL_MS. */
export default function OnlineRolesPanel() {
  const [data, setData] = useState<OnlineRolesData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/admin/online-roles", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json: OnlineRolesData = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Transient network hiccups just skip a tick — the next poll retries.
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>
        <span className={styles.liveTitleRow}>
          <span className={styles.liveDot} />
          Online Now
        </span>
      </h3>

      <div className={styles.onlineTotal}>{data ? data.online_total : "—"}</div>
      <span className={styles.onlineTotalLabel}>
        {data?.online_total === 1 ? "user active" : "users active"} in the last few minutes
      </span>

      <div className={styles.onlineRoleList}>
        {data && data.roles.length > 0 ? (
          data.roles.map((r, i) => (
            <div key={r.slug} className={styles.onlineRoleRow}>
              <span
                className={styles.userColorDot}
                style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }}
                aria-hidden
              />
              <span className={styles.onlineRoleName}>{r.name}</span>
              <span className={styles.onlineRoleCount}>{r.count}</span>
            </div>
          ))
        ) : (
          <span className={styles.permEmptyMuted}>No one online right now.</span>
        )}
      </div>
    </div>
  );
}
