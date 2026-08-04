/**
 * Modal for the logged-in warehouse manager to edit their own warehouse's
 * operational info — contact number and status only (capacity/code/
 * district/location stay officer/admin-only, see
 * WarehouseManagerSelfUpdateSerializer). Submits via the
 * updateMyWarehouseInfo Server Action using useActionState.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { updateMyWarehouseInfo, type WarehouseManagerFormState } from "@/app/actions/warehouseManager";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "./WarehouseManagerDashboard.module.css";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "full", label: "Full" },
  { value: "under_maintenance", label: "Under Maintenance" },
];

const initialState: WarehouseManagerFormState = {};

export default function WarehouseInfoModal({
  contactNumber,
  status,
  onClose,
}: {
  contactNumber: string;
  status: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateMyWarehouseInfo, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <Pencil size={18} />
            Edit warehouse info
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact_number">Contact number</label>
              <input
                id="contact_number"
                name="contact_number"
                type="text"
                defaultValue={contactNumber}
                className={styles.input}
                placeholder="e.g. 0771234567"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="status">Status</label>
              <StyledSelect id="status" name="status" defaultValue={status} options={STATUS_OPTIONS} />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
