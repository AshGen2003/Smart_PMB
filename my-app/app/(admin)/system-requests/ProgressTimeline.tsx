/**
 * Vertical stepper over a SystemChangeRequest's progress_updates (newest
 * first, matching SystemChangeRequestProgressUpdate.Meta.ordering) — the
 * admin-authored work-progress trail an officer watches on their own
 * request, mirroring how the driver portal surfaces delivery status
 * (see driver/TaskActionButtons.tsx) but as a full timeline rather than a
 * single current-stage badge, since here the admin posts multiple stages
 * over the request's lifetime rather than the requester advancing it
 * themselves.
 */
import { format } from "date-fns";
import { STAGE_LABEL, type ProgressUpdateRow } from "./types";
import styles from "./SystemRequests.module.css";

export default function ProgressTimeline({ updates }: { updates: ProgressUpdateRow[] }) {
  if (updates.length === 0) {
    return <p className={styles.emptyState}>No progress has been posted yet.</p>;
  }

  return (
    <div className={styles.timeline}>
      {updates.map((u) => (
        <div key={u.id} className={styles.timelineItem}>
          <div className={styles.timelineDot} />
          <div className={styles.timelineBody}>
            <span className={styles.timelineStage}>{STAGE_LABEL[u.stage]}</span>
            <span className={styles.timelineMeta}>
              {format(new Date(u.created_at), "MMM d, yyyy · h:mm a")}
              {u.updated_by_name && ` · ${u.updated_by_name}`}
            </span>
            {u.note && <p className={styles.timelineNote}>{u.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
