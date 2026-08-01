/**
 * `/driver/vehicle-details` — read-only reference page for a driver: full
 * spec sheet of every vehicle they've been assigned, the routes those
 * deliveries used, and their complete delivery history. Nothing here is
 * editable — vehicles/routes/deliveries stay officer-managed
 * (`manage_transport`); this page only ever reads
 * `/api/driver/vehicle-info/`, which itself scopes everything to
 * `driver=request.user` server-side (see DriverVehicleInfoView). Requires
 * `view_vehicle_details` — granted to "driver" by default (see
 * accounts/migrations/0017), toggleable from /roles or the Preview Portal.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import styles from "../DriverDashboard.module.css";

type VehicleInfo = {
  id: number;
  registration_no: string;
  vehicle_type: string;
  model: string;
  manufacture_year: number | null;
  size: string;
  capacity_kg: number;
  status: "active" | "inactive" | "maintenance" | "retired";
};

type RouteInfo = {
  id: number;
  origin: string;
  destination: string;
  distance_km: string;
  estimated_time: string;
};

type DeliveryInfo = {
  id: number;
  vehicle_registration: string | null;
  route_label: string | null;
  warehouse_name: string | null;
  scheduled_date: string;
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
};

type VehicleInfoData = {
  vehicles: VehicleInfo[];
  routes: RouteInfo[];
  deliveries: DeliveryInfo[];
};

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  lorry: "Lorry", van: "Van", tractor: "Tractor",
  three_wheeler: "Three Wheeler", pickup: "Pickup", other: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: styles["badge-neutral"],
  in_transit: styles["badge-warning"],
  delivered: styles["badge-success"],
  delayed: styles["badge-warning"],
  cancelled: styles["badge-danger"],
  active: styles["badge-success"],
  inactive: styles["badge-neutral"],
  maintenance: styles["badge-warning"],
  retired: styles["badge-danger"],
};

// Shown while Portal Preview is active — mirrors driver/page.tsx's
// SAMPLE_DRIVER_DASHBOARD pattern.
const SAMPLE_VEHICLE_INFO: VehicleInfoData = {
  vehicles: [
    { id: -1, registration_no: "WP-DEMO-01", vehicle_type: "lorry", model: "Tata 407", manufacture_year: 2021, size: "14ft", capacity_kg: 8000, status: "active" },
    { id: -2, registration_no: "WP-DEMO-02", vehicle_type: "van", model: "Toyota Hiace", manufacture_year: 2019, size: "6-wheeler", capacity_kg: 2000, status: "active" },
  ],
  routes: [
    { id: -1, origin: "Anuradhapura Central Store", destination: "Colombo Rice Mill", distance_km: "205.0", estimated_time: "4h 30m" },
    { id: -2, origin: "Polonnaruwa Storage Facility", destination: "Kandy Rice Mill", distance_km: "140.5", estimated_time: "3h 10m" },
  ],
  deliveries: [
    { id: -1, vehicle_registration: "WP-DEMO-02", route_label: "Polonnaruwa Storage Facility → Kandy Rice Mill", warehouse_name: "Polonnaruwa Storage Facility", scheduled_date: "2026-07-22", status: "in_transit", assignment_status: "accepted" },
    { id: -2, vehicle_registration: "WP-DEMO-01", route_label: "Anuradhapura Central Store → Colombo Rice Mill", warehouse_name: "Anuradhapura Central Store", scheduled_date: "2026-07-18", status: "delivered", assignment_status: "accepted" },
  ],
};

export default async function DriverVehicleDetailsPage() {
  const user = await requirePermission("view_vehicle_details");

  let data: VehicleInfoData;
  if (user.previewing) {
    data = SAMPLE_VEHICLE_INFO;
  } else {
    const res = await apiFetch("/api/driver/vehicle-info/");
    data = res.ok ? await res.json() : { vehicles: [], routes: [], deliveries: [] };
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vehicle Details</h1>
        <p className={styles.subtitle}>Read-only reference for the vehicles, routes, and deliveries assigned to you.</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Your vehicles</h2>
        {data.vehicles.length > 0 ? (
          <div className={styles.specGrid}>
            {data.vehicles.map((v) => (
              <div key={v.id} className={styles.specCard}>
                <div className={styles.specTitle}>{v.registration_no}</div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Type</span>
                  <span className={styles.specValue}>{VEHICLE_TYPE_LABEL[v.vehicle_type] ?? v.vehicle_type}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Model</span>
                  <span className={styles.specValue}>
                    {v.model || "—"}{v.manufacture_year ? ` (${v.manufacture_year})` : ""}
                  </span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Size</span>
                  <span className={styles.specValue}>{v.size || "—"}</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Capacity</span>
                  <span className={styles.specValue}>{v.capacity_kg.toLocaleString()} kg</span>
                </div>
                <div className={styles.specRow}>
                  <span className={styles.specLabel}>Status</span>
                  <span className={`${styles.badge} ${STATUS_BADGE[v.status]}`}>{v.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No vehicle has been assigned to you yet.</p>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Routes you've driven</h2>
        {data.routes.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Origin</th><th>Destination</th><th>Distance (km)</th><th>Est. time</th>
                </tr>
              </thead>
              <tbody>
                {data.routes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.origin}</td>
                    <td>{r.destination}</td>
                    <td>{Number(r.distance_km).toLocaleString()}</td>
                    <td>{r.estimated_time || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No routes yet.</p>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Delivery history</h2>
        {data.deliveries.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Route</th><th>Vehicle</th><th>Warehouse</th><th>Date</th><th>Task response</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.deliveries.map((d) => (
                  <tr key={d.id}>
                    <td>{d.route_label ?? "—"}</td>
                    <td>{d.vehicle_registration ?? "—"}</td>
                    <td>{d.warehouse_name ?? "—"}</td>
                    <td>{d.scheduled_date}</td>
                    <td><span className={styles.badge}>{d.assignment_status}</span></td>
                    <td>
                      <span className={`${styles.badge} ${STATUS_BADGE[d.status]}`}>{d.status.replace("_", " ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyState}>No deliveries yet.</p>
        )}
      </div>
    </div>
  );
}
