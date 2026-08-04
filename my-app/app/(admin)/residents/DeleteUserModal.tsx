/**
 * Confirmation modal shown before permanently deleting a user account —
 * replaces a plain window.confirm() with a modal that spells out the
 * blast radius: this is a real, permanent delete (the app has no
 * soft-delete), and it cascades to the user's role-specific profile and
 * everything hanging off it (a farmer's harvests/payments, a mill owner's
 * licenses/milling reports, etc. — see the FK on_delete=CASCADE chains in
 * the corresponding models).
 */
"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import styles from "./Users.module.css";

export default function DeleteUserModal({
  email,
  fullName,
  pending,
  onConfirm,
  onClose,
}: {
  email: string;
  fullName: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.deleteModalIcon}>
          <AlertTriangle size={22} />
        </div>

        <h2 className={styles.modalTitle}>Delete this user?</h2>

        <p className={styles.deleteModalBody}>
          You&apos;re about to permanently delete <strong>{fullName || email}</strong> (
          {email}). This can&apos;t be undone — there&apos;s no recovery afterward, and it
          also deletes everything tied to their account (profile records, harvests,
          payments, licenses, and similar history), not just the login itself.
        </p>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerBtn}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 size={16} className={styles.spin} />}
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>

        <button
          type="button"
          className={styles.iconBtn}
          style={{ position: "absolute", top: "1rem", right: "1rem" }}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
