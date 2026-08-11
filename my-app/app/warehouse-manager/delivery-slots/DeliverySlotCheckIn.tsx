/**
 * Client Component for the warehouse manager's delivery-slot check-in
 * screen: a lookup-by-reference form (pre-filled and auto-looked-up when
 * arriving via `?ref=` from a scanned QR — see page.tsx), then a card
 * showing the booking's details with Arrived/Completed/No-show actions
 * depending on its current status.
 */
"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Check, Loader2, QrCode, Search, UserX } from "lucide-react";
import { checkInDeliverySlot, lookupDeliverySlot } from "@/app/actions/warehouseManager";
import styles from "./DeliverySlotCheckIn.module.css";

export type DeliverySlotLookupRow = {
  id: number;
  farmer_name: string | null;
  farmer_registration_no: string | null;
  paddy_type_name: string | null;
  estimated_quantity_kg: string;
  scheduled_date: string;
  status: "booked" | "arrived" | "completed" | "cancelled" | "no_show";
  booking_reference: string;
  checked_in_at: string | null;
};

const STATUS_BADGE: Record<DeliverySlotLookupRow["status"], string> = {
  booked: "badge-warning",
  arrived: "badge-success",
  completed: "badge-success",
  cancelled: "badge-neutral",
  no_show: "badge-danger",
};

export default function DeliverySlotCheckIn({
  initialRef,
  initialSlot,
  initialError,
}: {
  initialRef: string;
  initialSlot: DeliverySlotLookupRow | null;
  initialError: string | null;
}) {
  const [ref, setRef] = useState(initialRef);
  const [slot, setSlot] = useState<DeliverySlotLookupRow | null>(initialSlot);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLookup() {
    const trimmed = ref.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await lookupDeliverySlot(trimmed);
      if (result.error) {
        setError(result.error);
        setSlot(null);
        return;
      }
      setSlot(result.slot ?? null);
    });
  }

  function handleCheckIn(action: "arrived" | "completed" | "no_show") {
    if (!slot) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await checkInDeliverySlot(slot.id, action);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSlot(result.slot ?? null);
      setSuccess(
        action === "arrived"
          ? "Marked as arrived."
          : action === "completed"
          ? "Marked as completed."
          : "Marked as no-show."
      );
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Delivery Check-In</h1>
        <span className={styles.subtitle}>
          Scan a farmer&apos;s booking QR, or enter their reference number below.
        </span>
      </div>

      <div className={styles.lookupRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="ref">Booking reference</label>
          <input
            id="ref"
            className={styles.input}
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="e.g. BK-20260810-A1B2C3"
          />
        </div>
        <button type="button" className={styles.lookupBtn} disabled={isPending || !ref.trim()} onClick={handleLookup}>
          {isPending ? <Loader2 size={16} className={styles.spin} /> : <Search size={16} />}
          Look up
        </button>
      </div>

      {error && <div className={styles.banner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      {slot ? (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.farmerName}>{slot.farmer_name ?? "—"}</div>
              <div className={styles.farmerMeta}>{slot.farmer_registration_no ?? "—"}</div>
            </div>
            <span className={`${styles.badge} ${styles[STATUS_BADGE[slot.status]]}`}>
              {slot.status.replace("_", " ")}
            </span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Reference</span>
              <span className={styles.detailValue}>{slot.booking_reference}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Scheduled date</span>
              <span className={styles.detailValue}>{format(new Date(slot.scheduled_date), "MMM d, yyyy")}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Paddy type</span>
              <span className={styles.detailValue}>{slot.paddy_type_name ?? "Not specified"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Est. quantity</span>
              <span className={styles.detailValue}>{Number(slot.estimated_quantity_kg).toLocaleString()} kg</span>
            </div>
            {slot.checked_in_at && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Checked in</span>
                <span className={styles.detailValue}>{format(new Date(slot.checked_in_at), "MMM d, yyyy h:mm a")}</span>
              </div>
            )}
          </div>

          {slot.status === "booked" && (
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.arriveBtn}`}
                disabled={isPending}
                onClick={() => handleCheckIn("arrived")}
              >
                {isPending ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
                Mark arrived
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.noShowBtn}`}
                disabled={isPending}
                onClick={() => handleCheckIn("no_show")}
              >
                <UserX size={16} />
                No-show
              </button>
            </div>
          )}

          {slot.status === "arrived" && (
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.arriveBtn}`}
                disabled={isPending}
                onClick={() => handleCheckIn("completed")}
              >
                {isPending ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
                Mark completed
              </button>
            </div>
          )}
        </div>
      ) : (
        !error && (
          <div className={styles.emptyState}>
            <QrCode size={28} style={{ opacity: 0.6 }} />
            <p>Look up a booking by reference to see its details here.</p>
          </div>
        )
      )}
    </div>
  );
}
