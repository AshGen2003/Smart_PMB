/**
 * Presentational panel shown on the admin dashboard for Authorized
 * Purchasers (users with `record_purchases` but not `monitor_operations`).
 * Unlike OfficerDashboardPanel (which this replaces for that audience),
 * everything here is scoped to the purchaser's own data: their personal
 * stock ledger and their own rice requests — no nationwide warehouse/
 * harvest figures.
 *
 * Client Component: drives the request form and withdraw action via Server
 * Actions (submitRiceRequest / withdrawRiceRequest).
 */
"use client";

import { useActionState, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { Boxes, Layers, Loader2, ClipboardList } from "lucide-react";
import { submitRiceRequest, withdrawRiceRequest, type PurchaseRequestFormState } from "@/app/actions/purchases";
import dashboardStyles from "./Dashboard.module.css";
import formStyles from "@/app/components/SettingsSections.module.css";

/** Shape of the payload returned by `GET /api/purchaser/dashboard/`. */
type PurchaserDashboardData = {
  kpis: {
    total_stock_kg: string | number;
    stock_types_count: number;
    pending_requests_count: number;
  };
  stock_by_type: {
    id: number;
    paddy_type: number;
    paddy_type_name: string | null;
    quantity_kg: string;
  }[];
  recent_requests: {
    id: number;
    paddy_type: number;
    paddy_type_name: string | null;
    quantity_kg: string;
    status: "pending" | "approved" | "rejected" | "fulfilled";
    requested_date: string;
  }[];
};

export type PaddyTypeOption = { id: number; type_name: string };

const STATUS_BADGE: Record<string, string> = {
  pending: dashboardStyles["badge-warning"],
  approved: dashboardStyles["badge-success"],
  fulfilled: dashboardStyles["badge-success"],
  rejected: dashboardStyles["badge-danger"],
};

const initialState: PurchaseRequestFormState = {};

export default function PurchaserDashboardPanel({
  data,
  paddyTypes,
}: {
  data: PurchaserDashboardData;
  paddyTypes: PaddyTypeOption[];
}) {
  const [state, formAction, pending] = useActionState(submitRiceRequest, initialState);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, startWithdraw] = useTransition();

  function handleWithdraw(id: number) {
    setWithdrawError(null);
    startWithdraw(async () => {
      const result = await withdrawRiceRequest(id);
      if (result.error) setWithdrawError(result.error);
    });
  }

  return (
    <div className={dashboardStyles.dashboard}>
      <div className={dashboardStyles.header}>
        <h1 className={dashboardStyles.title}>Purchasing Dashboard</h1>
        <span className={dashboardStyles.subtitle}>Your stock on hand and rice requests</span>
      </div>

      <div className={dashboardStyles.kpiGrid}>
        <div className={dashboardStyles.kpiCard}>
          <div className={dashboardStyles.kpiHeader}>
            <span>Total Stock (kg)</span>
            <div className={dashboardStyles.kpiIcon}><Boxes size={20} /></div>
          </div>
          <h2 className={dashboardStyles.kpiValue}>{Number(data.kpis.total_stock_kg).toLocaleString()}</h2>
        </div>

        <div className={dashboardStyles.kpiCard}>
          <div className={dashboardStyles.kpiHeader}>
            <span>Rice Types in Stock</span>
            <div className={dashboardStyles.kpiIcon}><Layers size={20} /></div>
          </div>
          <h2 className={dashboardStyles.kpiValue}>{data.kpis.stock_types_count}</h2>
        </div>

        <div className={dashboardStyles.kpiCard}>
          <div className={dashboardStyles.kpiHeader}>
            <span>Pending Requests</span>
            <div className={dashboardStyles.kpiIcon}><ClipboardList size={20} /></div>
          </div>
          <h2 className={dashboardStyles.kpiValue}>{data.kpis.pending_requests_count}</h2>
        </div>
      </div>

      <div className={dashboardStyles.tablesGrid}>
        <div className={dashboardStyles.tableCard}>
          <div className={dashboardStyles.tableHeader}>
            <h3 className={dashboardStyles.tableTitle}>My Stock by Rice Type</h3>
          </div>
          {data.stock_by_type.length > 0 ? (
            <table className={dashboardStyles.table}>
              <thead>
                <tr>
                  <th>Rice type</th>
                  <th>Quantity (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.stock_by_type.map((s) => (
                  <tr key={s.id}>
                    <td>{s.paddy_type_name ?? "—"}</td>
                    <td>{Number(s.quantity_kg).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={formStyles.cardSubtitle}>You don&apos;t have any stock yet.</p>
          )}
        </div>

        <div className={formStyles.card}>
          <h3 className={dashboardStyles.tableTitle}>Request Rice</h3>
          <p className={formStyles.cardSubtitle}>
            Ask for a specific rice type and quantity. A PMB officer will review and fulfill it.
          </p>

          {state.error && <div className={clsx(formStyles.banner, formStyles.bannerError)}>{state.error}</div>}

          <form action={formAction} noValidate>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="paddy_type">Rice type</label>
              <select id="paddy_type" name="paddy_type" required className={formStyles.input} defaultValue="">
                <option value="" disabled>Select a rice type</option>
                {paddyTypes.map((p) => (
                  <option key={p.id} value={p.id}>{p.type_name}</option>
                ))}
              </select>
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor="quantity_kg">Quantity (kg)</label>
              <input
                id="quantity_kg"
                name="quantity_kg"
                type="number"
                step="0.01"
                min="0.01"
                required
                className={formStyles.input}
              />
            </div>

            <button type="submit" className={formStyles.submitBtn} disabled={pending}>
              {pending && <Loader2 size={16} className={formStyles.spin} />}
              {pending ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </div>
      </div>

      <div className={dashboardStyles.tableCard}>
        <div className={dashboardStyles.tableHeader}>
          <h3 className={dashboardStyles.tableTitle}>My Recent Requests</h3>
        </div>
        {withdrawError && <div className={clsx(formStyles.banner, formStyles.bannerError)}>{withdrawError}</div>}
        {data.recent_requests.length > 0 ? (
          <table className={dashboardStyles.table}>
            <thead>
              <tr>
                <th>Rice type</th>
                <th>Quantity (kg)</th>
                <th>Status</th>
                <th>Requested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recent_requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.paddy_type_name ?? "—"}</td>
                  <td>{Number(r.quantity_kg).toLocaleString()}</td>
                  <td>
                    <span className={clsx(dashboardStyles.badge, STATUS_BADGE[r.status])}>{r.status}</span>
                  </td>
                  <td>{format(new Date(r.requested_date), "MMM d, yyyy")}</td>
                  <td>
                    {r.status === "pending" && (
                      <button
                        type="button"
                        className={formStyles.themeSwitch}
                        disabled={isWithdrawing}
                        onClick={() => handleWithdraw(r.id)}
                      >
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={formStyles.cardSubtitle}>You haven&apos;t made any requests yet.</p>
        )}
      </div>
    </div>
  );
}
