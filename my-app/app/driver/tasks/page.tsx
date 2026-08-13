/**
 * `/driver/tasks` — every one of the driver's still-live delivery tasks
 * (pending response, accepted-and-upcoming, in transit, or delayed —
 * delivered/cancelled/rejected ones stay off this page, they already have
 * a home on the dashboard's "recent deliveries" table) in one searchable,
 * prioritized list, so expired/overdue tasks that used to clutter the
 * dashboard have a real place to live instead. See DriverTasksManager for
 * the actual clustering/search/sub-tab logic — this page just fetches and
 * hands off the full list, same shape as driver/page.tsx's dashboard.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import DriverTasksManager, { type DriverTask } from "./DriverTasksManager";

type TasksData = { tasks: DriverTask[] };

// Shown while Portal Preview is active — spans pending/accepted/overdue so
// preview mode actually exercises both sub-tabs. Mirrors driver/page.tsx's
// SAMPLE_DRIVER_DASHBOARD and vehicle-details/page.tsx's
// SAMPLE_VEHICLE_INFO pattern.
const SAMPLE_TASKS: TasksData = {
  tasks: [
    {
      id: -1,
      vehicle_registration: "WP-DEMO-02",
      route_label: "Polonnaruwa Storage Facility → Kandy Rice Mill",
      route_destination: "Kandy Rice Mill",
      warehouse_name: "Polonnaruwa Storage Facility",
      scheduled_date: "2026-07-22",
      scheduled_time: "09:00:00",
      status: "in_transit",
      assignment_status: "accepted",
    },
    {
      id: -2,
      vehicle_registration: "WP-DEMO-01",
      route_label: "Anuradhapura Central Store → Colombo Rice Mill",
      route_destination: "Colombo Rice Mill",
      warehouse_name: "Anuradhapura Central Store",
      scheduled_date: "2026-07-25",
      scheduled_time: "14:00:00",
      status: "scheduled",
      assignment_status: "pending",
    },
    {
      id: -3,
      vehicle_registration: "WP-DEMO-01",
      route_label: "Kurunegala Regional Store → Colombo Central Store",
      route_destination: "Colombo Central Store",
      warehouse_name: "Kurunegala Regional Store",
      scheduled_date: "2026-07-15",
      scheduled_time: "08:00:00",
      status: "scheduled",
      assignment_status: "pending",
    },
  ],
};

export default async function DriverTasksPage() {
  const user = await requirePermission("view_tasks");

  let data: TasksData;
  if (user.previewing) {
    data = SAMPLE_TASKS;
  } else {
    const res = await apiFetch("/api/driver/tasks/");
    data = res.ok ? await res.json() : { tasks: [] };
  }

  return <DriverTasksManager tasks={data.tasks} readOnly={!!user.previewing} />;
}
