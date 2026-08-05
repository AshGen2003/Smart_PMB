/**
 * Modal dialog with the full license application form: what an officer
 * actually needs to review before issuing a rice-mill operating license,
 * not just a bare "apply" button. Also used for renewals (pass
 * `renewedFrom`, which is submitted as a hidden field). Submits via the
 * applyForLicense Server Action using useActionState, mirroring
 * (admin)/approvals/HarvestFormModal.tsx.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { ClipboardList, Loader2, X } from "lucide-react";
import { applyForLicense } from "@/app/actions/mills";
import StyledSelect from "@/app/components/StyledSelect";
import styles from "./Licenses.module.css";

const initialState: { error?: string } = {};

export default function LicenseApplicationFormModal({
  renewedFrom,
  onClose,
}: {
  // When set, this application is a renewal of that (approved) license id.
  renewedFrom?: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(applyForLicense, initialState);
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
            <ClipboardList size={20} />
            {renewedFrom ? "Renew license" : "Apply for a mill license"}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.banner}>{state.error}</div>}

          <form action={formAction}>
            {renewedFrom && <input type="hidden" name="renewed_from" value={renewedFrom} />}

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="milling_type">Milling type</label>
                <StyledSelect
                  id="milling_type"
                  name="milling_type"
                  required
                  placeholder="Select milling type"
                  options={[
                    { value: "raw", label: "Raw" },
                    { value: "parboiled", label: "Parboiled" },
                    { value: "both", label: "Both" },
                  ]}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="requested_capacity_mt_per_day">
                  Requested capacity <span className={styles.optional}>(MT/day)</span>
                </label>
                <input
                  id="requested_capacity_mt_per_day"
                  name="requested_capacity_mt_per_day"
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="premises_address">Mill premises address</label>
              <textarea
                id="premises_address"
                name="premises_address"
                required
                rows={2}
                className={styles.textarea}
                placeholder="Physical address of the mill this license covers"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="justification">Justification</label>
              <textarea
                id="justification"
                name="justification"
                required
                rows={3}
                className={styles.textarea}
                placeholder="Why you're requesting this license — expected paddy sources, intended market, etc."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact_number">
                Contact number <span className={styles.optional}>(optional)</span>
              </label>
              <input id="contact_number" name="contact_number" type="tel" className={styles.input} />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Submitting…" : renewedFrom ? "Submit renewal" : "Submit application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
