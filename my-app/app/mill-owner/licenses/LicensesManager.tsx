/**
 * Client Component driving the mill owner's license applications: a table
 * of all their applications plus an "Apply for License" button (opens the
 * full LicenseApplicationFormModal) and a withdraw action (only shown on
 * pending rows). Mirrors the table/action pattern in
 * app/farmer/harvests/HarvestsManager.tsx.
 */
"use client";

import React, { useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Plus, FileCheck } from "lucide-react";
import { applyForLicense, withdrawLicense } from "@/app/actions/mills";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "./Licenses.module.css";

export type LicenseRow = {
  id: number;
  license_no: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | "revoked";
  applied_date: string;
  issued_date: string | null;
  expiry_date: string | null;
  review_notes: string;
  renewed_from: number | null;
  requested_capacity_mt_per_day: string | null;
  milling_type: "raw" | "parboiled" | "both" | "";
  premises_address: string;
  justification: string;
  contact_number: string;
};

const LICENSE_BADGE: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  suspended: "badge-warning",
  revoked: "badge-danger",
};

const MILLING_TYPE_LABEL: Record<string, string> = {
  raw: "Raw",
  parboiled: "Parboiled",
  both: "Both",
};

const EXPIRY_WARNING_DAYS = 30;

export default function LicensesManager({ licenses }: { licenses: LicenseRow[] }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<{ renewedFrom?: number } | null>(null);

  const [withdrawTarget, setWithdrawTarget] = useState<LicenseRow | null>(null);

  function handleWithdraw(l: LicenseRow) {
    setWithdrawTarget(l);
  }

  function confirmWithdraw() {
    if (!withdrawTarget) return;
    const target = withdrawTarget;
    setActionError(null);
    startTransition(async () => {
      const result = await withdrawLicense(target.id);
      if (result.error) setActionError(result.error);
      setWithdrawTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Licenses</h1>
          <span className={styles.subtitle}>Apply for a rice mill license and track its approval status</span>
        </div>
        <button type="button" className={styles.newBtn} onClick={() => setModal({})}>
          <Plus size={16} /> Apply for license
        </button>
      </div>

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        {licenses.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>License No.</th>
                  <th>Applied</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((l) => (
                  <tr key={l.id}>
                    <td>{l.license_no ?? "—"}</td>
                    <td>{format(new Date(l.applied_date), "MMM d, yyyy")}</td>
                    <td>{l.expiry_date ? format(new Date(l.expiry_date), "MMM d, yyyy") : "—"}</td>
                    <td>
                      <span className={clsx(styles.badge, styles[LICENSE_BADGE[l.status] ?? "badge-neutral"])}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.status === "pending" && (
                        <button
                          type="button"
                          className={styles.withdrawBtn}
                          disabled={isPending}
                          onClick={() => handleWithdraw(l)}
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FileCheck size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <div>No license applications yet. Use &quot;Apply for license&quot; to submit one.</div>
          </div>
        )}
      </div>

      {withdrawTarget && (
        <ConfirmModal
          title="Withdraw this application?"
          message="This cannot be undone."
          confirmLabel="Withdraw"
          pendingLabel="Withdrawing…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmWithdraw}
          onClose={() => setWithdrawTarget(null)}
        />
      )}
    </div>
  );
}
