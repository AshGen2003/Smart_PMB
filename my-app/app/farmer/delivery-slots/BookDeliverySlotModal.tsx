/**
 * Modal dialog for a farmer to book an advance delivery slot at a
 * warehouse. Mirrors farmer/harvests/LogHarvestModal.tsx's shape and
 * submits via the submitDeliverySlot Server Action using useActionState.
 */
"use client";

import React, { useEffect, useRef, useActionState } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";
import { submitDeliverySlot, type DeliverySlotFormState } from "@/app/actions/farmer";
import { useLanguage } from "@/app/components/LanguageProvider";
import StyledDatePicker from "@/app/components/StyledDatePicker";
import styles from "./DeliverySlots.module.css";

export type WarehouseOption = { id: number; name: string };
export type PaddyTypeOption = { id: number; type_name: string };

const initialState: DeliverySlotFormState = {};

export default function BookDeliverySlotModal({
  warehouses,
  paddyTypes,
  onClose,
}: {
  warehouses: WarehouseOption[];
  paddyTypes: PaddyTypeOption[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(submitDeliverySlot, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <CalendarClock size={20} />
            {t.bookDeliverySlotModal.title}
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label={t.bookDeliverySlotModal.close}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="warehouse">{t.bookDeliverySlotModal.warehouseLabel}</label>
              <select id="warehouse" name="warehouse" required className={styles.input} defaultValue="">
                <option value="" disabled>{t.bookDeliverySlotModal.selectWarehousePlaceholder}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="paddy_type">{t.bookDeliverySlotModal.paddyTypeLabel}</label>
              <select id="paddy_type" name="paddy_type" className={styles.input} defaultValue="">
                <option value="">{t.bookDeliverySlotModal.selectPaddyTypePlaceholder}</option>
                {paddyTypes.map((p) => (
                  <option key={p.id} value={p.id}>{p.type_name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="estimated_quantity_kg">{t.bookDeliverySlotModal.quantityLabel}</label>
              <input
                id="estimated_quantity_kg"
                name="estimated_quantity_kg"
                type="number"
                step="0.01"
                min="0.01"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="scheduled_date">{t.bookDeliverySlotModal.dateLabel}</label>
              <StyledDatePicker id="scheduled_date" name="scheduled_date" min={todayStr} required />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                {t.bookDeliverySlotModal.cancel}
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? t.bookDeliverySlotModal.submitting : t.bookDeliverySlotModal.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
