/**
 * Client Component driving the officer-facing mill license review queue:
 * tab-filters applications by status, and (when `canWrite` is true) lets
 * the user approve pending applications or reject them with an optional
 * note. Mirrors the tab/table/action pattern in
 * (admin)/approvals/ApprovalsManager.tsx.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { Check, FileCheck, X } from "lucide-react";
import { approveLicense, rejectLicense } from "@/app/actions/licenses";
import styles from "./Licenses.module.css";

export type LicenseRow = {
  id: number;
  mill: number;
  mill_name: string | null;
  mill_registration_no: string | null;
  license_no: string | null;
  status: "pending" | "approved" | "rejected";
  applied_date: string;
  issued_date: string | null;
  expiry_date: string | null;
  reviewed_by_name: string | null;
  review_notes: string;
};

const TABS: { key: LicenseRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function LicensesManager({
  licenses,
  canWrite,
}: {
  licenses: LicenseRow[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<LicenseRow["status"]>("pending");
  const [rejectTarget, setRejectTarget] = useState<LicenseRow | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => licenses.filter((l) => l.status === tab), [licenses, tab]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of licenses) map[l.status] = (map[l.status] ?? 0) + 1;
    return map;
  }, [licenses]);

  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setActionError(result.error);
    });
  }

  function handleApprove(l: LicenseRow) {
    runAction(() => approveLicense(l.id));
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setRejectTarget(null);
    runAction(async () => {
      const result = await rejectLicense(target.id, rejectNotes);
      setRejectNotes("");
      return result;
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mill License Applications</h1>
      </div>

      <div className={styles.tabsRow}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={clsx(styles.tab, tab === t.key && styles.tabActive)}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className={styles.tabCount}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {actionError && <div className={styles.banner}>{actionError}</div>}

      <div className={styles.container}>
        {filtered.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mill</th>
                  <th>Reg. No.</th>
                  <th>License No.</th>
                  <th>Applied</th>
                  <th>Expiry</th>
                  <th>Reviewed by</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td>{l.mill_name ?? "—"}</td>
                    <td>{l.mill_registration_no ?? "—"}</td>
                    <td>{l.license_no ?? "—"}</td>
                    <td>{format(new Date(l.applied_date), "MMM d, yyyy")}</td>
                    <td>{l.expiry_date ? format(new Date(l.expiry_date), "MMM d, yyyy") : "—"}</td>
                    <td>{l.reviewed_by_name ?? "—"}</td>
                    {canWrite && (
                      <td>
                        {l.status === "pending" && (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.approveBtn)}
                              aria-label="Approve"
                              disabled={isPending}
                              onClick={() => handleApprove(l)}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.rejectBtn)}
                              aria-label="Reject"
                              disabled={isPending}
                              onClick={() => setRejectTarget(l)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FileCheck size={28} />
            <p>No {tab} license applications.</p>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reject license application</h3>
            <textarea
              className={styles.textarea}
              placeholder="Reason (optional)"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryBtn} onClick={handleRejectConfirm}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
