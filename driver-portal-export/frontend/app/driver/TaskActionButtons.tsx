/**
 * Client Components for the driver dashboard's task cards: Accept/Reject
 * for a pending task, and Start Trip / Mark Delivered for the active one.
 * Both call their Server Action directly inside a transition (rather than
 * a plain `<form action>`) so a failure — e.g. someone else already
 * responded to this task — shows up as visible feedback instead of being
 * silently swallowed.
 */
"use client";

import { useState, useTransition } from "react";
import { respondToTask, updateTaskStatus } from "@/app/actions/driver";
import styles from "./DriverDashboard.module.css";

export function TaskResponseButtons({ taskId }: { taskId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToTask(taskId, accept);
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.taskActions}>
        <button type="button" className={styles.acceptBtn} disabled={isPending} onClick={() => respond(true)}>
          Accept
        </button>
        <button type="button" className={styles.rejectBtn} disabled={isPending} onClick={() => respond(false)}>
          Reject
        </button>
      </div>
    </>
  );
}

export function TaskProgressButton({
  taskId,
  nextStatus,
  label,
}: {
  taskId: number;
  nextStatus: "in_transit" | "delivered";
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function progress() {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, nextStatus);
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.taskActions}>
        <button type="button" className={styles.startBtn} disabled={isPending} onClick={progress}>
          {isPending ? "Saving…" : label}
        </button>
      </div>
    </>
  );
}
