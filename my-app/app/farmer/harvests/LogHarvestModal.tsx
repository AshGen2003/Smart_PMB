/**
 * Modal dialog for a farmer to submit a new harvest delivery. Only asks for
 * paddy type and quantity — everything else (grade, price, warehouse) is
 * filled in later by an officer during approval. Submits via the
 * submitHarvest Server Action using useActionState, mirroring the
 * create/edit modal pattern in (admin)/approvals/HarvestFormModal.tsx.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { Sprout, Loader2, X } from "lucide-react";
import { submitHarvest, type HarvestFormState } from "@/app/actions/farmer";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "./Harvests.module.css";

export type PaddyTypeOption = { id: number; type_name: string };

const initialState: HarvestFormState = {};

export default function LogHarvestModal({
  paddyTypes,
  onClose,
}: {
  paddyTypes: PaddyTypeOption[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  // `state` holds the result of the last submit attempt (e.g. an error
  // message from the backend). `formAction` is what the <form> below calls
  // on submit. `pending` is true while the request is in flight (used to
  // show a spinner and disable the button).
  const [state, formAction, pending] = useActionState(submitHarvest, initialState);
  const wasSubmitting = useRef(false);

  // Once a submit finishes successfully (no error), close this popup
  // automatically so the farmer sees their new harvest in the table.
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
            <Sprout size={20} />
            {t.logHarvestModal.title}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label={t.logHarvestModal.close}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Shows a red banner with the backend's error message, if the last submit failed. */}
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          {/* Submitting this form calls submitHarvest() in app/actions/farmer.ts,
              which sends { paddy_type, quantity_kg } to the Django API. */}
          <form action={formAction}>
            {/* Dropdown of paddy types, loaded from the backend and passed in as the `paddyTypes` prop. */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="paddy_type">{t.logHarvestModal.paddyTypeLabel}</label>
              <select id="paddy_type" name="paddy_type" required className={styles.input} defaultValue="">
                <option value="" disabled>{t.logHarvestModal.selectPlaceholder}</option>
                {paddyTypes.map((p) => (
                  <option key={p.id} value={p.id}>{p.type_name}</option>
                ))}
              </select>
            </div>

            {/* To add a new field here (e.g. "notes"), copy this block, change the
                name/id, then also add it in actions/farmer.ts, the backend
                serializer, and the model — see the viva guide's worked example. */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="quantity_kg">{t.logHarvestModal.quantityLabel}</label>
              <input
                id="quantity_kg"
                name="quantity_kg"
                type="number"
                step="0.01"
                min="0"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                {t.logHarvestModal.cancel}
              </button>
              {/* Disabled + spinner while `pending` is true, so double-clicking can't submit twice. */}
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? t.logHarvestModal.submitting : t.logHarvestModal.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
