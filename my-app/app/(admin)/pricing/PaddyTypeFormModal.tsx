/**
 * Modal dialog with the create/edit form for a paddy type. Submits via a
 * Server Action (createPaddyType/updatePaddyType) using useActionState.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Coins, Loader2, X } from "lucide-react";
import {
  createPaddyType,
  updatePaddyType,
  type PaddyTypeFormState,
} from "@/app/actions/pricing";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "./Pricing.module.css";

// Common paddy varieties grown/purchased in Sri Lanka. `variety` is a plain
// text field on the backend (PaddyType.variety), so this is a curated
// picklist for consistency, not a hard backend constraint.
const VARIETY_OPTIONS = [
  { value: "BG 300", label: "BG 300" },
  { value: "BG 352", label: "BG 352" },
  { value: "BG 358", label: "BG 358" },
  { value: "BG 359", label: "BG 359" },
  { value: "BG 366", label: "BG 366" },
  { value: "BG 369", label: "BG 369" },
  { value: "BG 379-2", label: "BG 379-2" },
  { value: "BG 380", label: "BG 380" },
  { value: "AT 306", label: "AT 306" },
  { value: "AT 353", label: "AT 353" },
  { value: "AT 362", label: "AT 362" },
  { value: "LD 408", label: "LD 408" },
  { value: "BW 267-3", label: "BW 267-3" },
  { value: "BW 372", label: "BW 372" },
  { value: "Nadu", label: "Nadu" },
  { value: "Samba", label: "Samba" },
  { value: "Kekulu", label: "Kekulu" },
  { value: "Suwandel", label: "Suwandel" },
  { value: "Basmati", label: "Basmati" },
  { value: "Kalu Heenati", label: "Kalu Heenati" },
  { value: "Pachchaperumal", label: "Pachchaperumal" },
  { value: "Red Rice", label: "Red Rice" },
];

/** Subset of paddy-type fields needed to pre-fill the form when editing. */
export type EditablePaddyType = {
  id: number;
  type_name: string;
  variety: string;
  description: string;
  guaranteed_price: string;
  is_active: boolean;
};

const initialState: PaddyTypeFormState = {};

/**
 * Renders the paddy-type form inside a modal overlay. Picks
 * createPaddyType or updatePaddyType (with the id bound in) based on
 * `mode`, and closes itself once the save succeeds.
 */
export default function PaddyTypeFormModal({
  mode,
  paddyType,
  onClose,
}: {
  mode: "create" | "edit";
  paddyType?: EditablePaddyType;
  onClose: () => void;
}) {
  const action =
    mode === "create" ? createPaddyType : updatePaddyType.bind(null, paddyType!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasSubmitting = useRef(false);

  // Auto-close the modal once a pending submission resolves without error.
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
            <Coins size={20} />
            {mode === "create" ? "New paddy type" : `Edit — ${paddyType?.type_name}`}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="type_name">Type name</label>
              <input
                id="type_name"
                name="type_name"
                type="text"
                required
                defaultValue={paddyType?.type_name}
                className={styles.input}
                placeholder="e.g. Nadu"
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="variety">
                  Variety <span className={styles.optional}>(optional)</span>
                </label>
                <StyledSelect
                  id="variety"
                  name="variety"
                  options={VARIETY_OPTIONS}
                  defaultValue={paddyType?.variety}
                  placeholder="Select a variety…"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="guaranteed_price">
                  Guaranteed price (Rs./kg)
                </label>
                <input
                  id="guaranteed_price"
                  name="guaranteed_price"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={paddyType?.guaranteed_price}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">
                Description <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={paddyType?.description}
                className={styles.textarea}
                rows={2}
              />
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={paddyType?.is_active ?? true}
                className={styles.checkbox}
              />
              Active (visible to farmers)
            </label>

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
