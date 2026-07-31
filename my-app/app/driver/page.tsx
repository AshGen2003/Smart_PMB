/**
 * `/driver` — the driver portal's dashboard: pending delivery tasks
 * awaiting accept/reject, the current active (accepted) task with
 * Start Trip / Mark Delivered controls and a live location map, and a
 * table of recently completed deliveries.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { TaskResponseButtons, TaskProgressButton } from "./TaskActionButtons";
import { LocationReporter } from "./LocationReporter";
import styles from "./DriverDashboard.module.css";

type DeliveryTask = {
  id: number;
  vehicle_registration: string | null;
  driver_name: string | null;
  route_label: string | null;
  warehouse_name: string | null;
  scheduled_date: string;
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
  latest_location: { latitude: number; longitude: number; recorded_at: string } | null;
};

type DriverDashboardData = {
  pending_tasks: DeliveryTask[];
  active_task: DeliveryTask | null;
  recent_deliveries: DeliveryTask[];
  kpis: { total_deliveries: number; completed_deliveries: number; pending_tasks: number };
};

// Shown while Portal Preview is active — an admin previewing "Driver" has
// no real Delivery rows assigned to them, so the real API call would just
// come back empty. Mirrors farmer/page.tsx's SAMPLE_FARMER_DASHBOARD.
const SAMPLE_DRIVER_DASHBOARD: DriverDashboardData = {
  pending_tasks: [
    {
      id: -1,
      vehicle_registration: "WP-DEMO-01",
      driver_name: "Sample Driver",
      route_label: "Anuradhapura Central Store → Colombo Rice Mill",
      warehouse_name: "Anuradhapura Central Store",
      scheduled_date: "2026-07-25",
      status: "scheduled",
      assignment_status: "pending",
      latest_location: null,
    },
  ],
  active_task: {
    id: -2,
    vehicle_registration: "WP-DEMO-02",
    driver_name: "Sample Driver",
    route_label: "Polonnaruwa Storage Facility → Kandy Rice Mill",
    warehouse_name: "Polonnaruwa Storage Facility",
    scheduled_date: "2026-07-22",
    status: "in_transit",
    assignment_status: "accepted",
    latest_location: { latitude: 7.8731, longitude: 80.7718, recorded_at: "2026-07-22T10:00:00Z" },
  },
  recent_deliveries: [
    {
      id: -3,
      vehicle_registration: "WP-DEMO-01",
      driver_name: "Sample Driver",
      route_label: "Kurunegala Regional Store → Colombo Central Store",
      warehouse_name: "Kurunegala Regional Store",
      scheduled_date: "2026-07-18",
      status: "delivered",
      assignment_status: "accepted",
      latest_location: null,
    },
  ],
  kpis: { total_deliveries: 2, completed_deliveries: 1, pending_tasks: 1 },
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: styles["badge-neutral"],
  in_transit: styles["badge-warning"],
  delivered: styles["badge-success"],
  delayed: styles["badge-warning"],
  cancelled: styles["badge-danger"],
};

export default async function DriverDashboardPage() {
  const user = await getCurrentUser();

  let data: DriverDashboardData;
  if (user?.previewing) {
    data = SAMPLE_DRIVER_DASHBOARD;
  } else {
    const res = await apiFetch("/api/driver/dashboard/");
    data = res.ok
      ? await res.json()
      : { pending_tasks: [], active_task: null, recent_deliveries: [], kpis: { total_deliveries: 0, completed_deliveries: 0, pending_tasks: 0 } };
  }

  const readOnly = !!user?.previewing;

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back, {user?.fullName ?? "Driver"}</h1>
        <p className={styles.subtitle}>Your delivery tasks and current trip.</p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Pending tasks</span>
          <h2 className={styles.kpiValue}>{data.kpis.pending_tasks}</h2>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Accepted deliveries</span>
          <h2 className={styles.kpiValue}>{data.kpis.total_deliveries}</h2>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Completed</span>
          <h2 className={styles.kpiValue}>{data.kpis.completed_deliveries}</h2>
        </div>
      </div>

      {data.pending_tasks.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>New task{data.pending_tasks.length > 1 ? "s" : ""} — respond needed</h2>
          {data.pending_tasks.map((task) => (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskRoute}>{task.route_label}</div>
              <div className={styles.taskMeta}>
                {task.vehicle_registration} · {task.warehouse_name ?? "No warehouse set"} · {task.scheduled_date}
              </div>
              {!readOnly && <TaskResponseButtons taskId={task.id} />}
            </div>
          ))}
        </div>
      )}

      {data.active_task && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Current task</h2>
          <div className={styles.taskCard}>
            <div className={styles.taskRoute}>{data.active_task.route_label}</div>
            <div className={styles.taskMeta}>
              {data.active_task.vehicle_registration} · {data.active_task.warehouse_name ?? "No warehouse set"} ·{" "}
              {data.active_task.scheduled_date}
              {" · "}
              <span className={`${styles.badge} ${STATUS_BADGE[data.active_task.status]}`}>
                {data.active_task.status.replace("_", " ")}
              </span>
            </div>

            {!readOnly && data.active_task.status === "scheduled" && (
              <TaskProgressButton taskId={data.active_task.id} nextStatus="in_transit" label="Start Trip" />
            )}
            {!readOnly && data.active_task.status === "in_transit" && (
              <TaskProgressButton taskId={data.active_task.id} nextStatus="delivered" label="Mark Delivered" />
            )}

            {!readOnly && (
              <LocationReporter
                deliveryId={data.active_task.id}
                isInTransit={data.active_task.status === "in_transit"}
                initialLocation={data.active_task.latest_location}
              />
            )}
            {readOnly && data.active_task.latest_location && (
              <LocationReporter
                deliveryId={data.active_task.id}
                isInTransit={false}
                initialLocation={data.active_task.latest_location}
              />
            )}
          </div>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Recent deliveries</h2>
        {data.recent_deliveries.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_deliveries.map((d) => (
                <tr key={d.id}>
                  <td>{d.route_label}</td>
                  <td>{d.vehicle_registration}</td>
                  <td>{d.scheduled_date}</td>
                  <td>
                    <span className={`${styles.badge} ${STATUS_BADGE[d.status]}`}>
                      {d.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>No completed deliveries yet.</p>
        )}
      </div>
    </div>
  );
}
