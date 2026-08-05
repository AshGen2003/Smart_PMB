/**
 * Renders the farmer dashboard's content (KPIs, prices, notifications,
 * recent harvests). Split out from page.tsx (a Server Component) into its
 * own Client Component because it needs useLanguage() for translations.
 */
"use client";

import { format } from "date-fns";
import clsx from "clsx";
import { Sprout, Wallet, Coins, MapPin, Award } from "lucide-react";
import { markNotificationRead } from "@/app/actions/farmer";
import { useLanguage } from "@/app/components/LanguageProvider";
import FarmerCharts from "./FarmerCharts";
import styles from "./FarmerDashboard.module.css";

const HARVEST_BADGE: Record<string, string> = {
  pending: "badge-warning",
  verified: "badge-success",
  collected: "badge-success",
  rejected: "badge-danger",
};

export type DashboardPayload = {
  farmer: {
    registration_no: string;
    land_size: string | null;
    status: string;
    district: string | null;
    province: string | null;
    reliability_score: number;
  };
  kpis: {
    total_harvests: number;
    pending_payments: number;
    total_earnings: number;
  };
  quota: {
    max_quota_kg: number | null;
    quota_used_kg: number;
    quota_remaining_kg: number | null;
    season: "yala" | "maha";
  };
  current_season: "yala" | "maha";
  paddy_types: {
    id: number;
    type_name: string;
    variety: string | null;
    guaranteed_price: string;
  }[];
  harvests: {
    id: number;
    paddy_type_name: string | null;
    quantity_kg: string;
    harvest_date: string;
    status: string;
  }[];
  notifications: {
    id: number;
    message: string;
    sent_at: string;
    is_read: boolean;
  }[];
  charts: {
    status_breakdown: { status: string; label: string; count: number }[];
    harvest_trend: { period: string; quantity_kg: number }[];
  };
};

export default function FarmerDashboardView({
  data,
  userFullName,
  previewing,
}: {
  data: DashboardPayload | null;
  userFullName: string | null;
  previewing: boolean;
}) {
  const { t } = useLanguage();

  if (!data) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t.farmerDashboard.notFoundTitle}</h1>
          <p className={styles.subtitle}>{t.farmerDashboard.notFoundBody}</p>
        </div>
      </div>
    );
  }

  const { farmer, kpis, quota, current_season: currentSeason, paddy_types: paddyTypes, harvests, notifications } = data;
  const quotaUsedPct =
    quota.max_quota_kg && quota.max_quota_kg > 0
      ? Math.min((quota.quota_used_kg / quota.max_quota_kg) * 100, 100)
      : 0;

  const STATUS_LABEL: Record<string, string> = {
    pending: t.farmerCharts.statusPending,
    verified: t.farmerCharts.statusVerified,
    collected: t.farmerCharts.statusCollected,
    rejected: t.farmerCharts.statusRejected,
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>
              {t.farmerDashboard.welcome} {userFullName ?? t.farmerDashboard.defaultName}
            </h1>
            <span className={styles.subtitle}>
              {format(new Date(), "EEEE, MMMM do, yyyy")}
              {farmer.district ? ` · ${farmer.district}, ${farmer.province}` : ""}
            </span>
          </div>
          <div className={styles.regBadge}>{farmer.registration_no}</div>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>{t.farmerDashboard.kpiTotalHarvests}</span>
            <div className={styles.kpiIcon}>
              <Sprout size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.total_harvests}</h2>
          <span className={styles.kpiHint}>{t.farmerDashboard.kpiTotalHarvestsHint}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>{t.farmerDashboard.kpiPendingPayments}</span>
            <div className={styles.kpiIcon}>
              <Wallet size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.pending_payments}</h2>
          <span className={styles.kpiHint}>{t.farmerDashboard.kpiPendingPaymentsHint}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>{t.farmerDashboard.kpiTotalEarnings}</span>
            <div className={styles.kpiIcon}>
              <Coins size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>
            Rs. {Number(kpis.total_earnings).toLocaleString()}
          </h2>
          <span className={styles.kpiHint}>{t.farmerDashboard.kpiTotalEarningsHint}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>{t.farmerDashboard.kpiRegisteredLand}</span>
            <div className={styles.kpiIcon}>
              <MapPin size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>
            {farmer.land_size ? Number(farmer.land_size) : "—"}
            {farmer.land_size ? " ac" : ""}
          </h2>
          <span className={styles.kpiHint}>{farmer.status}</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>{t.farmerDashboard.kpiReliabilityScore}</span>
            <div className={styles.kpiIcon}>
              <Award size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{Math.round(farmer.reliability_score)}/100</h2>
          <span className={styles.kpiHint}>{t.farmerDashboard.kpiReliabilityScoreHint}</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t.farmerQuota.title}</h3>
          <span className={styles.priceVariety}>{t.seasons[quota.season]}</span>
        </div>
        {quota.max_quota_kg !== null ? (
          <>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${quotaUsedPct}%` }} />
            </div>
            <div className={styles.quotaStatsRow}>
              <span>
                {t.farmerQuota.used}: <span className={styles.quotaStatsValue}>{Math.round(quota.quota_used_kg).toLocaleString()} kg</span>
              </span>
              <span>
                {t.farmerQuota.remaining}:{" "}
                <span className={styles.quotaStatsValue}>
                  {Math.round(quota.quota_remaining_kg ?? 0).toLocaleString()} kg
                </span>
              </span>
              <span>
                {t.farmerDashboard.kpiRegisteredLand}: <span className={styles.quotaStatsValue}>{Math.round(quota.max_quota_kg).toLocaleString()} kg</span>
              </span>
            </div>
          </>
        ) : (
          <p className={styles.emptyState}>{t.farmerQuota.notSet}</p>
        )}
      </div>

      <FarmerCharts data={data.charts} />

      <div className={styles.gridTwo}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t.farmerDashboard.guaranteedPricesTitle}</h3>
            <span className={styles.priceVariety}>{t.seasons[currentSeason]}</span>
          </div>
          {paddyTypes.length > 0 ? (
            <div className={styles.priceList}>
              {paddyTypes.map((pt) => (
                <div className={styles.priceRow} key={pt.id}>
                  <div>
                    <div className={styles.priceType}>{pt.type_name}</div>
                    {pt.variety && (
                      <div className={styles.priceVariety}>{pt.variety}</div>
                    )}
                  </div>
                  <div className={styles.priceValue}>
                    Rs. {Number(pt.guaranteed_price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>{t.farmerDashboard.guaranteedPricesEmpty}</p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t.farmerDashboard.notificationsTitle}</h3>
          </div>
          {notifications.length > 0 ? (
            <div className={styles.notificationList}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={clsx(
                    styles.notification,
                    !n.is_read && styles.notificationUnread
                  )}
                >
                  <div>
                    <p className={styles.notificationMessage}>{n.message}</p>
                    <span className={styles.notificationDate}>
                      {format(new Date(n.sent_at), "MMM d, yyyy p")}
                    </span>
                  </div>
                  {/* Binding the notification id to the Server Action lets this
                      work as a plain <form> post — no client-side JS handler needed.
                      Hidden during Portal Preview since preview is read-only and
                      the sample notification's id isn't a real row anyway. */}
                  {!n.is_read && !previewing && (
                    <form action={markNotificationRead.bind(null, n.id)}>
                      <button type="submit" className={styles.markReadBtn}>
                        {t.farmerDashboard.markRead}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>{t.farmerDashboard.notificationsEmpty}</p>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{t.farmerDashboard.recentHarvestsTitle}</h3>
        </div>
        {harvests.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.farmerDashboard.tablePaddyType}</th>
                <th>{t.farmerDashboard.tableQuantity}</th>
                <th>{t.farmerDashboard.tableHarvestDate}</th>
                <th>{t.farmerDashboard.tableStatus}</th>
              </tr>
            </thead>
            <tbody>
              {harvests.map((h) => (
                <tr key={h.id}>
                  <td>{h.paddy_type_name ?? "—"}</td>
                  <td>{Number(h.quantity_kg).toLocaleString()}</td>
                  <td>{format(new Date(h.harvest_date), "MMM d, yyyy")}</td>
                  <td>
                    <span
                      className={clsx(
                        styles.badge,
                        styles[HARVEST_BADGE[h.status] ?? "badge-neutral"]
                      )}
                    >
                      {STATUS_LABEL[h.status] ?? h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>{t.farmerDashboard.recentHarvestsEmpty}</p>
        )}
      </div>
    </div>
  );
}
