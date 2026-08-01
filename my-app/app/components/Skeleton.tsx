/**
 * Shimmering placeholder blocks used for loading.tsx route fallbacks and
 * for client components that fetch after mount (NotificationBell,
 * MessagesHistoryView, OnlineRolesPanel, GenericDashboard's mount gate).
 */
import React from "react";
import clsx from "clsx";
import styles from "./Skeleton.module.css";

export function Skeleton({
  width,
  height = "1em",
  circle = false,
  className,
}: {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(styles.skeleton, circle && styles.circle, className)}
      style={{ width, height }}
    />
  );
}

/** Rows of shimmer bars sized like table cells, for list/table pages. */
export function SkeletonTableRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.table}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={styles.tableRow} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={c === 0 ? "88%" : "55%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full-page fallback matching the header-row + card + table shape most admin list pages share. */
export function SkeletonPage({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.headerRow}>
        <div>
          <Skeleton height={26} width={220} />
          <Skeleton height={14} width={160} className={styles.gapTop} />
        </div>
        <Skeleton height={38} width={130} className={styles.radiusSm} />
      </div>
      <div className={styles.card}>
        <SkeletonTableRows rows={rows} cols={cols} />
      </div>
    </div>
  );
}

/** Fallback matching the dashboard's title + KPI cards + chart cards shape. */
export function SkeletonDashboard() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <Skeleton height={26} width={240} />
      <div className={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.kpiCard}>
            <Skeleton height={14} width="60%" />
            <Skeleton height={26} width="40%" className={styles.gapTop} />
          </div>
        ))}
      </div>
      <div className={styles.chartsGrid}>
        <Skeleton height={260} className={styles.radiusMd} />
        <Skeleton height={260} className={styles.radiusMd} />
      </div>
    </div>
  );
}

/** Grid of shimmer cards, for card-grid pages (Warehouses, Pricing, Roles). */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.cardsGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.card}>
          <Skeleton height={18} width="60%" />
          <Skeleton height={28} width="45%" className={styles.gapTop} />
          <Skeleton height={12} width="80%" className={styles.gapTop} />
        </div>
      ))}
    </div>
  );
}

/** Full-page fallback matching the header-row + card-grid shape (Warehouses, Pricing, Roles). */
export function SkeletonCardsPage({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.headerRow}>
        <div>
          <Skeleton height={26} width={220} />
          <Skeleton height={14} width={160} className={styles.gapTop} />
        </div>
        <Skeleton height={38} width={130} className={styles.radiusSm} />
      </div>
      <SkeletonCards count={count} />
    </div>
  );
}

/** Compact row skeletons (sender/title line + shorter second line) for message-style lists. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.listRow}>
          <Skeleton height={13} width="70%" />
          <Skeleton height={12} width="40%" className={styles.gapTop} />
        </div>
      ))}
    </div>
  );
}
