/**
 * Small floating notification pop-up (bottom-right, auto-dismissing) for
 * confirming the result of an action after the fact — e.g. "user deleted"
 * or "delete failed" — as opposed to the inline banners already used
 * elsewhere for validation errors shown alongside a form.
 */
"use client";

import React, { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import clsx from "clsx";
import styles from "./Toast.module.css";

export type ToastState = { type: "success" | "error"; message: string } | null;

const AUTO_DISMISS_MS = 5000;

/** Renders nothing when `toast` is null; otherwise shows it and auto-dismisses after a few seconds. */
export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={clsx(
        styles.toast,
        toast.type === "success" ? styles.toastSuccess : styles.toastError
      )}
      role="status"
    >
      {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span className={styles.toastMessage}>{toast.message}</span>
      <button
        type="button"
        className={styles.toastCloseBtn}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
