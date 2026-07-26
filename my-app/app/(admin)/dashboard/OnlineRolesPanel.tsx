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
import { Skeleton, SkeletonRows } from "@/app/components/Skeleton";
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
export default function OnlineRolesPanel({
  roleOrder,
}: {
  // The same role list (in the same order) that the "Users by Role"
  // bar chart/table use to assign colors, so a role's color here matches
  // its color everywhere else on the dashboard — the online endpoint's own
  // response is sorted by online-count instead, which would otherwise give
  // the same role a different color depending on how many of its users
  // happen to be online right now.
  roleOrder: { name: string; slug: string }[];
}) {
  const [data, setData] = useState<OnlineRolesData | null>(null);

  const colorForSlug = (slug: string) => {
    const index = roleOrder.findIndex((r) => r.slug === slug);
    return ROLE_COLORS[(index < 0 ? 0 : index) % ROLE_COLORS.length];
  };

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
