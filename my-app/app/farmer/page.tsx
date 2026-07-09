import { format } from "date-fns";
import clsx from "clsx";
import { Sprout, Wallet, Coins, MapPin } from "lucide-react";
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { markNotificationRead } from "@/app/actions/farmer";
import styles from "./FarmerDashboard.module.css";

const HARVEST_BADGE: Record<string, string> = {
  pending: "badge-warning",
  verified: "badge-success",
  collected: "badge-success",
  rejected: "badge-danger",
};

type DashboardPayload = {
  farmer: {
    registration_no: string;
    land_size: string | null;
    status: string;
    district: string | null;
    province: string | null;
  };
  kpis: {
    total_harvests: number;
    pending_payments: number;
    total_earnings: number;
  };
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
};

export default async function FarmerDashboardPage() {
  const user = await getCurrentUser();
  const res = await apiFetch("/api/farmer/dashboard/");

  if (!res.ok) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.card}>
          <h1 className={styles.title}>Almost there</h1>
          <p className={styles.subtitle}>
            We couldn&apos;t find your farmer profile yet. Please contact
            support if this persists.
          </p>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as DashboardPayload;
  const { farmer, kpis, paddy_types: paddyTypes, harvests, notifications } = data;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>
              Welcome back, {user?.fullName ?? "Farmer"}
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
            <span>Total Harvests</span>
            <div className={styles.kpiIcon}>
              <Sprout size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.total_harvests}</h2>
          <span className={styles.kpiHint}>Logged with Smart PMB</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Pending Payments</span>
            <div className={styles.kpiIcon}>
              <Wallet size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{kpis.pending_payments}</h2>
          <span className={styles.kpiHint}>Awaiting processing</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Earnings</span>
            <div className={styles.kpiIcon}>
              <Coins size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>
            Rs. {Number(kpis.total_earnings).toLocaleString()}
          </h2>
          <span className={styles.kpiHint}>From completed payments</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Registered Land</span>
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
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Guaranteed Paddy Prices</h3>
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
            <p className={styles.emptyState}>No paddy prices published yet.</p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Notifications</h3>
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
                  {!n.is_read && (
                    <form action={markNotificationRead.bind(null, n.id)}>
                      <button type="submit" className={styles.markReadBtn}>
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>You&apos;re all caught up.</p>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Recent Harvests</h3>
        </div>
        {harvests.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paddy Type</th>
                <th>Quantity (kg)</th>
                <th>Harvest Date</th>
                <th>Status</th>
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
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>
            No harvests logged yet. Once your first collection is recorded,
            it&apos;ll show up here.
          </p>
        )}
      </div>
    </div>
  );
}
