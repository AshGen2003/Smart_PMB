/**
 * Client Component rendering a farmer's full payment history (farmers.
 * views.FarmerPaymentListView) — read-only, no actions (disbursement is
 * officer-only, see farmers.views.OfficerPaymentViewSet).
 */
"use client";

import React from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "./Payments.module.css";

export type PaymentRow = {
  id: number;
  harvest: number;
  amount: string;
  status: "pending" | "processing" | "disbursed" | "failed";
  payment_date: string | null;
  method: "bank_transfer" | "cash" | "cheque";
  disbursement_reference: string;
  disbursed_date: string | null;
};

const STATUS_BADGE: Record<PaymentRow["status"], string> = {
  pending: "badge-warning",
  processing: "badge-warning",
  disbursed: "badge-success",
  failed: "badge-danger",
};

export default function PaymentsManager({ payments }: { payments: PaymentRow[] }) {
  const { t } = useLanguage();

  const STATUS_LABEL: Record<PaymentRow["status"], string> = {
    pending: t.farmerPayments.statusPending,
    processing: t.farmerPayments.statusProcessing,
    disbursed: t.farmerPayments.statusDisbursed,
    failed: t.farmerPayments.statusFailed,
  };

  const METHOD_LABEL: Record<PaymentRow["method"], string> = {
    bank_transfer: t.farmerPayments.methodBankTransfer,
    cash: t.farmerPayments.methodCash,
    cheque: t.farmerPayments.methodCheque,
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t.farmerPayments.title}</h1>
          <span className={styles.subtitle}>{t.farmerPayments.subtitle}</span>
        </div>
      </div>

      <div className={styles.container}>
        {payments.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.farmerPayments.tableAmount}</th>
                <th>{t.farmerPayments.tableMethod}</th>
                <th>{t.farmerPayments.tableStatus}</th>
                <th>{t.farmerPayments.tablePaymentDate}</th>
                <th>{t.farmerPayments.tableReference}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{Number(p.amount).toLocaleString()}</td>
                  <td>{METHOD_LABEL[p.method]}</td>
                  <td>
                    <span className={clsx(styles.badge, styles[STATUS_BADGE[p.status]])}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td>{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</td>
                  <td>{p.disbursement_reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <Wallet size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>{t.farmerPayments.emptyState}</div>
          </div>
        )}
      </div>
    </div>
  );
}
