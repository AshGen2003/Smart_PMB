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

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";
import styles from "./Dashboard.module.css";

type OnlineRolesData = {
  online_total: number;
  roles: { name: string; slug: string; count: number }[];
};

const POLL_INTERVAL_MS = 10_000;

/** Renders the live online-user-by-role card, polling for fresh counts every POLL_INTERVAL_MS. */
export default function OnlineRolesPanel({
  roleColors,
}: {
  // The same slug -> color map (see lib/roleColors.ts) the "Users by Role"
  // bar chart/table use, so a role's color here matches its color
  // everywhere else on the dashboard — the online endpoint's own response
  // is sorted by online-count instead, which would otherwise give the same
  // role a different color depending on how many of its users happen to be
  // online right now.
  roleColors: Record<string, string>;
}) {
  const [data, setData] = useState<OnlineRolesData | null>(null);
  // Separate from the poll interval below so a manual click can show its
  // own brief spin without waiting on/disturbing the automatic cadence.
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  const colorForSlug = (slug: string) => roleColors[slug] ?? "var(--chart-neutral)";

  // Shared by the automatic interval below and the manual refresh button,
  // so a click doesn't just wait for the next tick.
  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/online-roles", { cache: "no-store" });
      if (!res.ok || cancelledRef.current) return;
      const json: OnlineRolesData = await res.json();
      if (!cancelledRef.current) setData(json);
    } catch {
      // Transient network hiccups just skip a tick — the next poll retries.
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, same as the interval ticks it kicks off right after
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [poll]);

  async function handleManualRefresh() {
    setRefreshing(true);
    await poll();
    setRefreshing(false);
  }

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>
        <span className={styles.liveTitleRow}>
          <span className={styles.liveDot} />
          Online Now
        </span>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={handleManualRefresh}
          disabled={refreshing}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? styles.refreshSpin : undefined} />
        </button>
      </h3>

      {data ? (
        <>
          <div className={styles.onlineTotal}>{data.online_total}</div>
          <span className={styles.onlineTotalLabel}>
            {data.online_total === 1 ? "user active" : "users active"} in the last few minutes
          </span>
        </>
      ) : (
        <>
          <Skeleton height={32} width={60} />
          <Skeleton height={12} width={160} className={styles.onlineTotalLabel} />
        </>
      )}

      <div className={styles.onlineRoleList}>
        {data === null ? (
          <SkeletonRows count={3} />
        ) : data.roles.length > 0 ? (
          data.roles.map((r) => (
            <div key={r.slug} className={styles.onlineRoleRow}>
              <span
                className={styles.userColorDot}
                style={{ backgroundColor: colorForSlug(r.slug) }}
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
