/**
 * Client Component for the driver's Tasks page: a search box plus two
 * sub-tabs — Active (in-transit/delayed first, then soonest-scheduled
 * pending/accepted tasks) and Overdue (a task whose start time has passed
 * without the driver having started it — pending tasks nobody responded
 * to in time, or accepted-but-never-started ones). Reuses
 * TaskResponseButtons/TaskProgressButton from ../TaskActionButtons rather
 * than duplicating the accept/reject/progress logic.
 */
"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { TaskResponseButtons, TaskProgressButton } from "../TaskActionButtons";
import dashboardStyles from "../DriverDashboard.module.css";
import styles from "./DriverTasks.module.css";

export type DriverTask = {
  id: number;
  vehicle_registration: string | null;
  route_label: string | null;
  route_destination: string | null;
  warehouse_name: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  assignment_status: "pending" | "accepted" | "rejected";
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: dashboardStyles["badge-neutral"],
  in_transit: dashboardStyles["badge-warning"],
  delayed: dashboardStyles["badge-warning"],
};

function scheduledDateTime(task: DriverTask): Date | null {
  if (!task.scheduled_time) return null;
  return new Date(`${task.scheduled_date}T${task.scheduled_time}`);
}

function isOverdue(task: DriverTask, now: Date): boolean {
  if (task.status !== "scheduled") return false; // in_transit/delayed always count as still-active, not missed
  const dt = scheduledDateTime(task);
  return dt !== null && dt.getTime() < now.getTime();
}

// Lower sorts first: in-transit/delayed need attention right now, then
// soonest-scheduled next, undated tasks (no scheduled_time) last within
// their bucket since there's nothing to prioritize them by.
function priorityRank(task: DriverTask): number {
  if (task.status === "in_transit") return 0;
  if (task.status === "delayed") return 1;
  return 2;
}

export default function DriverTasksManager({
  tasks,
  readOnly,
}: {
  tasks: DriverTask[];
  readOnly: boolean;
}) {
  const [query, setQuery] = useState("");
  const [subTab, setSubTab] = useState<"active" | "overdue">("active");

  const { active, overdue } = useMemo(() => {
    const now = new Date();
    const active: DriverTask[] = [];
    const overdue: DriverTask[] = [];
    for (const task of tasks) {
      (isOverdue(task, now) ? overdue : active).push(task);
    }
    active.sort((a, b) => {
      const rankDiff = priorityRank(a) - priorityRank(b);
      if (rankDiff !== 0) return rankDiff;
      const aTime = scheduledDateTime(a)?.getTime() ?? Infinity;
      const bTime = scheduledDateTime(b)?.getTime() ?? Infinity;
      return aTime - bTime;
    });
    overdue.sort((a, b) => (scheduledDateTime(a)?.getTime() ?? 0) - (scheduledDateTime(b)?.getTime() ?? 0));
    return { active, overdue };
  }, [tasks]);

  const filter = (list: DriverTask[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      [t.route_label, t.vehicle_registration, t.warehouse_name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  };

  const visible = filter(subTab === "active" ? active : overdue);

  return (
    <div className={dashboardStyles.dashboard}>
      <div className={dashboardStyles.header}>
        <h1 className={dashboardStyles.title}>Tasks</h1>
        <p className={dashboardStyles.subtitle}>Every delivery task assigned to you that still needs attention.</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={clsx(styles.tab, subTab === "active" && styles.tabActive)}
            onClick={() => setSubTab("active")}
          >
            Active ({active.length})
          </button>
          <button
            type="button"
            className={clsx(styles.tab, subTab === "overdue" && styles.tabActive)}
            onClick={() => setSubTab("overdue")}
          >
            Overdue ({overdue.length})
          </button>
        </div>

        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={dashboardStyles.card}>
        {visible.length > 0 ? (
          visible.map((task) => (
            <div key={task.id} className={dashboardStyles.taskCard}>
              <div className={dashboardStyles.taskRoute}>{task.route_label}</div>
              <div className={dashboardStyles.taskMeta}>
                {task.vehicle_registration} · {task.warehouse_name ?? "No warehouse set"} · {task.scheduled_date}
                {task.scheduled_time ? ` ${task.scheduled_time.slice(0, 5)}` : ""}
                {" · "}
                <span className={clsx(dashboardStyles.badge, STATUS_BADGE[task.status])}>
                  {task.status.replace("_", " ")}
                </span>
              </div>

              {!readOnly && task.assignment_status === "pending" && <TaskResponseButtons taskId={task.id} />}
              {!readOnly && task.assignment_status === "accepted" && task.status === "scheduled" && (
                <TaskProgressButton taskId={task.id} nextStatus="in_transit" label="Start Trip" />
              )}
              {!readOnly && task.assignment_status === "accepted" && task.status === "in_transit" && (
                <TaskProgressButton taskId={task.id} nextStatus="delivered" label="Mark Delivered" />
              )}
            </div>
          ))
        ) : (
          <p className={dashboardStyles.emptyState}>
            {query ? "No tasks match your search." : subTab === "active" ? "No active tasks." : "No overdue tasks."}
          </p>
        )}
      </div>
    </div>
  );
}
