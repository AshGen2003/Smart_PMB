/**
 * App-styled confirmation dialog, replacing the browser's native
 * `window.confirm()` (which can't be styled, shows the raw hostname, and
 * gives no feedback once clicked) — same visual language as
 * ImpersonateConfirmModal.tsx. Shows a spinner and disables both buttons
 * while `pending` is true, so a click always gives some visible feedback
 * that it registered rather than appearing to do nothing until the
 * request resolves.
 */
"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import clsx from "clsx";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  pendingLabel,
  variant = "danger",
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  /** Shown on the confirm button while `pending` — defaults to "<confirmLabel>…". */
  pendingLabel?: string;
  /** "danger" (red) for destructive/irreversible actions, "warning" (amber) for everything else. */
  variant?: "danger" | "warning";
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={pending ? undefined : onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={clsx(styles.icon, styles[variant])}>
          <AlertTriangle size={22} />
        </div>

        <h2 className={styles.title}>{title}</h2>

        <p className={styles.body}>{message}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={clsx(styles.confirmBtn, styles[variant])}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 size={16} className={styles.spin} />}
            {pending ? pendingLabel ?? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>

        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={pending}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
