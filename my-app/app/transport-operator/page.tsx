/**
 * `/transport-operator` — the transport operator portal's home dashboard:
 * fleet-wide KPIs (vehicles, drivers, deliveries, running costs). Full
 * fleet CRUD lives on the Fleet page (reuses TransportationManager, the
 * same component the PMB Officer's /transportation page uses — see
 * app/components/TransportationManager.tsx). Access is enforced by
 * app/transport-operator/layout.tsx.
 */
import { format } from "date-fns";
import { Truck, Users, PackageCheck, Fuel } from "lucide-react";
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_TRANSPORTATION } from "@/app/lib/previewSampleData";
import styles from "./TransportOperatorDashboard.module.css";

type Stats = {
  vehicles_total: number;
  vehicles_active: number;
  drivers_total: number;
  drivers_available: number;
  deliveries_scheduled: number;
  deliveries_in_transit: number;
  fuel_cost_total: number;
  maintenance_cost_total: number;
};

export default async function TransportOperatorDashboardPage() {
  const user = await getCurrentUser();

  const stats: Stats = user?.previewing
    ? PREVIEW_TRANSPORTATION.stats
    : await (async () => {
        const res = await apiFetch("/api/admin/transportation/dashboard/");
        return res.ok
          ? await res.json()
          : {
              vehicles_total: 0, vehicles_active: 0, drivers_total: 0, drivers_available: 0,
              deliveries_scheduled: 0, deliveries_in_transit: 0, fuel_cost_total: 0, maintenance_cost_total: 0,
            };
      })();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back, {user?.fullName ?? "Transport Operator"}</h1>
        <span className={styles.subtitle}>{format(new Date(), "EEEE, MMMM do, yyyy")}</span>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Fleet</span>
            <div className={styles.kpiIcon}>
              <Truck size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{stats.vehicles_active} / {stats.vehicles_total}</h2>
          <span className={styles.kpiHint}>Active vehicles</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Drivers</span>
            <div className={styles.kpiIcon}>
              <Users size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{stats.drivers_available} / {stats.drivers_total}</h2>
          <span className={styles.kpiHint}>Currently available</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Deliveries</span>
            <div className={styles.kpiIcon}>
              <PackageCheck size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>{stats.deliveries_in_transit}</h2>
          <span className={styles.kpiHint}>{stats.deliveries_scheduled} scheduled</span>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Running Costs</span>
            <div className={styles.kpiIcon}>
              <Fuel size={20} />
            </div>
          </div>
          <h2 className={styles.kpiValue}>
            Rs. {(stats.fuel_cost_total + stats.maintenance_cost_total).toLocaleString()}
          </h2>
          <span className={styles.kpiHint}>Fuel + maintenance total</span>
        </div>
      </div>
    </div>
  );
}
