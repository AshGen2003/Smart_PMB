/**
 * Modal for a PMB officer/admin (holding "appoint_warehouse_managers") to
 * assign this warehouse's manager — either a brand new warehouse_manager
 * account (email + name, temp password emailed the same way any other
 * admin-created account gets one — see accounts/emails.py's
 * send_temp_password_email) or an existing warehouse_manager account
 * reassigned from wherever they were before. Submits via the
 * appointWarehouseManager Server Action using useActionState.
 */
"use client";

import React, { useEffect, useRef, useState, useActionState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { appointWarehouseManager } from "@/app/actions/warehouses";
import type { WarehouseFormState } from "@/app/actions/warehouses";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "./Warehouses.module.css";

export type ManagerOption = { id: string; name: string };

const initialState: WarehouseFormState = {};

export default function AppointWarehouseManagerModal({
  warehouseId,
  warehouseName,
  existingManagers,
  onClose,
}: {
  warehouseId: number;
  warehouseName: string;
  existingManagers: ManagerOption[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"new" | "existing">(existingManagers.length > 0 ? "existing" : "new");
  const [email, setEmail] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  const action = appointWarehouseManager.bind(null, warehouseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      setSucceeded(true);
    }
  }, [pending, state]);

  if (succeeded) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalHeaderTitle}>
              <UserPlus size={20} />
              Manager appointed — {warehouseName}
            </div>
            <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <p className={styles.detailEmpty}>
              {mode === "new"
                ? `Temporary credentials emailed to ${email}. They must set their own password on first login.`
                : "This warehouse's manager has been updated."}
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.primaryBtn} onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <UserPlus size={20} />
            Appoint manager — {warehouseName}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <div className={styles.modalActions} style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: "1.1rem" }}>
            <button
              type="button"
              className={mode === "existing" ? styles.primaryBtn : styles.secondaryBtn}
              onClick={() => setMode("existing")}
              disabled={existingManagers.length === 0}
            >
              Existing manager
            </button>
            <button
              type="button"
              className={mode === "new" ? styles.primaryBtn : styles.secondaryBtn}
              onClick={() => setMode("new")}
            >
              New manager
            </button>
          </div>

          <form action={formAction}>
            {mode === "existing" ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="user_id">Warehouse manager</label>
                <StyledSelect
                  id="user_id"
                  name="user_id"
                  placeholder="Select a warehouse manager"
                  required
                  options={existingManagers.map((m) => ({ value: m.id, label: m.name }))}
                />
              </div>
            ) : (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="full_name">Full name</label>
                  <input id="full_name" name="full_name" type="text" required className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </>
            )}

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Saving…" : "Appoint manager"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
