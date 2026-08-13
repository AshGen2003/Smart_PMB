/**
 * Client Component for the warehouse manager's read-only outgoing-
 * deliveries list: every load carrying a purchaser's fulfilled rice
 * request out of this warehouse, its transport status, and — once the
 * purchaser confirms on their end (purchases.RiceRequestViewSet.
 * confirm_receipt) — the receipt confirmation. No actions here; release/
 * in-transit/delivered stay driver-driven, same as everywhere else in the
 * app. Mirrors ../transactions/TransactionsManager.tsx's search-filter
 * pattern.
 */
"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { CheckCircle2, Search, Truck } from "lucide-react";
import styles from "./Deliveries.module.css";

export type DeliveryRow = {
  id: number;
  rice_request: number;
  purchaser_name: string | null;
  paddy_type_name: string | null;
  quantity_kg: string | null;
  driver_name: string | null;
  vehicle_registration: string | null;
  scheduled_date: string;
  status: "scheduled" | "in_transit" | "delivered" | "delayed" | "cancelled";
  received_at: string | null;
  received_by_name: string | null;
};

const STATUS_LABEL: Record<DeliveryRow["status"], string> = {
  scheduled: "Scheduled",
  in_transit: "In Transit",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<DeliveryRow["status"], string> = {
  scheduled: styles["badge-warning"],
  in_transit: styles["badge-warning"],
  delivered: styles["badge-success"],
  delayed: styles["badge-danger"],
  cancelled: styles["badge-danger"],
};

export default function DeliveriesManager({ deliveries }: { deliveries: DeliveryRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deliveries;
    return deliveries.filter(
      (d) =>
        (d.purchaser_name ?? "").toLowerCase().includes(q) ||
        (d.paddy_type_name ?? "").toLowerCase().includes(q) ||
        (d.driver_name ?? "").toLowerCase().includes(q)
    );
  }, [deliveries, search]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Deliveries</h1>
        <span className={styles.subtitle}>Loads dispatched to authorized purchasers from your warehouse</span>
      </div>

      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by purchaser, paddy type, or driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.container}>
        {filtered.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Purchaser</th>
                  <th>Paddy type</th>
                  <th>Quantity (kg)</th>
                  <th>Driver / Vehicle</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>{d.purchaser_name ?? "—"}</td>
                    <td>{d.paddy_type_name ?? "—"}</td>
                    <td>{d.quantity_kg !== null ? Number(d.quantity_kg).toLocaleString() : "—"}</td>
                    <td>
                      {d.driver_name ?? "—"} ({d.vehicle_registration ?? "—"})
                    </td>
                    <td>{format(new Date(d.scheduled_date), "MMM d, yyyy")}</td>
                    <td>
                      <span className={clsx(styles.badge, STATUS_BADGE[d.status])}>{STATUS_LABEL[d.status]}</span>
                    </td>
                    <td>
                      {d.received_at ? (
                        <span className={clsx(styles.badge, styles["badge-success"])}>
                          <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                          {format(new Date(d.received_at), "MMM d, yyyy")}
                          {d.received_by_name ? ` — ${d.received_by_name}` : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Truck size={28} />
            <p>{search ? "No deliveries match your search." : "No deliveries dispatched yet."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
