/**
 * Client Component driving the farmer's own delivery-slot bookings: a
 * table of booking history plus a "Book slot" button that opens
 * BookDeliverySlotModal, a cancel action (only shown on booked rows), and
 * a "View QR" action showing the check-in QR code for the warehouse
 * manager to scan. Mirrors farmer/harvests/HarvestsManager.tsx.
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { CalendarClock, Plus, QrCode, X } from "lucide-react";
import { cancelDeliverySlot } from "@/app/actions/farmer";
import { useLanguage } from "@/app/components/LanguageProvider";
import ConfirmModal from "@/app/components/ConfirmModal";
import BookDeliverySlotModal, { type PaddyTypeOption, type WarehouseOption } from "./BookDeliverySlotModal";
import styles from "./DeliverySlots.module.css";

export type DeliverySlotRow = {
  id: number;
  warehouse: number;
  warehouse_name: string | null;
  paddy_type: number | null;
  paddy_type_name: string | null;
  estimated_quantity_kg: string;
  scheduled_date: string;
  status: "booked" | "arrived" | "completed" | "cancelled" | "no_show";
  booking_reference: string;
};

const STATUS_BADGE: Record<DeliverySlotRow["status"], string> = {
  booked: "badge-warning",
  arrived: "badge-success",
  completed: "badge-success",
  cancelled: "badge-neutral",
  no_show: "badge-danger",
};

export default function DeliverySlotsManager({
  slots,
  warehouses,
  paddyTypes,
}: {
  slots: DeliverySlotRow[];
  warehouses: WarehouseOption[];
  paddyTypes: PaddyTypeOption[];
}) {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DeliverySlotRow | null>(null);
  const [qrTarget, setQrTarget] = useState<DeliverySlotRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const STATUS_LABEL: Record<DeliverySlotRow["status"], string> = {
    booked: t.farmerDeliverySlots.statusBooked,
    arrived: t.farmerDeliverySlots.statusArrived,
    completed: t.farmerDeliverySlots.statusCompleted,
    cancelled: t.farmerDeliverySlots.statusCancelled,
    no_show: t.farmerDeliverySlots.statusNoShow,
  };

  function confirmCancel() {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await cancelDeliverySlot(target.id);
      if (result.error) setActionError(result.error);
      setCancelTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t.farmerDeliverySlots.title}</h1>
          <span className={styles.subtitle}>{t.farmerDeliverySlots.subtitle}</span>
        </div>
        <button type="button" className={styles.newBtn} onClick={() => setModalOpen(true)}>
          <Plus size={16} /> {t.farmerDeliverySlots.bookSlot}
        </button>
      </div>

      {actionError && <div className={styles.modalBanner}>{actionError}</div>}

      <div className={styles.container}>
        {slots.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.farmerDeliverySlots.tableWarehouse}</th>
                  <th>{t.farmerDeliverySlots.tablePaddyType}</th>
                  <th>{t.farmerDeliverySlots.tableQuantity}</th>
                  <th>{t.farmerDeliverySlots.tableDate}</th>
                  <th>{t.farmerDeliverySlots.tableReference}</th>
                  <th>{t.farmerDeliverySlots.tableStatus}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id}>
                    <td>{s.warehouse_name ?? "—"}</td>
                    <td>{s.paddy_type_name ?? "—"}</td>
                    <td>{Number(s.estimated_quantity_kg).toLocaleString()}</td>
                    <td>{format(new Date(s.scheduled_date), "MMM d, yyyy")}</td>
                    <td>{s.booking_reference}</td>
                    <td>
                      <span className={clsx(styles.badge, styles[STATUS_BADGE[s.status]])}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td>
                      {s.status === "booked" && (
                        <button
                          type="button"
                          className={styles.withdrawBtn}
                          disabled={isPending}
                          onClick={() => setCancelTarget(s)}
                        >
                          {t.farmerDeliverySlots.cancelSlot}
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.traceLink}
                        onClick={() => setQrTarget(s)}
                      >
                        <QrCode size={14} /> {t.farmerDeliverySlots.viewQr}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <CalendarClock size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>{t.farmerDeliverySlots.emptyState}</div>
          </div>
        )}
      </div>

      {modalOpen && (
        <BookDeliverySlotModal warehouses={warehouses} paddyTypes={paddyTypes} onClose={() => setModalOpen(false)} />
      )}

      {cancelTarget && (
        <ConfirmModal
          title={t.farmerDeliverySlots.confirmCancelTitle}
          message={t.farmerDeliverySlots.confirmCancel}
          confirmLabel={t.farmerDeliverySlots.cancelSlot}
          pendingLabel={t.farmerDeliverySlots.cancelling}
          variant="warning"
          pending={isPending}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {qrTarget && (
        <div className={styles.overlay} onClick={() => setQrTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <QrCode size={20} />
                {t.farmerDeliverySlots.qrModalTitle}
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setQrTarget(null)}
                aria-label={t.bookDeliverySlotModal.close}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody} style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- same-origin proxy route, not an optimizable remote image */}
              <img
                src={`/api/delivery-slots/${qrTarget.booking_reference}/qr`}
                alt={qrTarget.booking_reference}
                width={220}
                height={220}
                style={{ maxWidth: "100%", height: "auto" }}
              />
              <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {t.farmerDeliverySlots.qrModalHint}
              </p>
              <p style={{ fontWeight: 600 }}>{qrTarget.booking_reference}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
