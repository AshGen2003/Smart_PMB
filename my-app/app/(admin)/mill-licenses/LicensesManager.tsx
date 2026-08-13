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
import { Ban, Check, ChevronDown, ChevronUp, FileCheck, PauseCircle, X } from "lucide-react";
import {
  approveMillLicense,
  rejectMillLicense,
  revokeMillLicense,
  suspendMillLicense,
} from "@/app/actions/mill-licenses";
import styles from "./Licenses.module.css";

export type LicenseRow = {
  id: number;
  mill: number;
  mill_name: string | null;
  mill_registration_no: string | null;
  license_no: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | "revoked";
  applied_date: string;
  issued_date: string | null;
  expiry_date: string | null;
  reviewed_by_name: string | null;
  review_notes: string;
  renewed_from: number | null;
  requested_capacity_mt_per_day: string | null;
  milling_type: "raw" | "parboiled" | "both" | "";
  premises_address: string;
  justification: string;
  contact_number: string;
};

const MILLING_TYPE_LABEL: Record<string, string> = {
  raw: "Raw",
  parboiled: "Parboiled",
  both: "Both",
};

const TABS: { key: LicenseRow["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "suspended", label: "Suspended" },
  { key: "revoked", label: "Revoked" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<LicenseRow["status"], string> = {
  pending: "badge-warning",
  approved: "badge-success",
  suspended: "badge-warning",
  revoked: "badge-danger",
  rejected: "badge-danger",
};

export default function LicensesManager({
  licenses,
  canWrite,
}: {
  licenses: LicenseRow[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<LicenseRow["status"]>("pending");
  // A single modal handles reject/suspend/revoke — they're all "pick a
  // target, write a reason, confirm" with only the action and copy differing.
  const [reasonTarget, setReasonTarget] = useState<{ license: LicenseRow; kind: "reject" | "suspend" | "revoke" } | null>(null);
  const [reasonNotes, setReasonNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
    runAction(() => approveMillLicense(l.id));
  }

  const REASON_COPY = {
    reject: { title: "Reject license application", action: rejectMillLicense, placeholder: "Reason (optional)", required: false },
    suspend: { title: "Suspend license", action: suspendMillLicense, placeholder: "Reason (required)", required: true },
    revoke: { title: "Revoke license", action: revokeMillLicense, placeholder: "Reason (required)", required: true },
  } as const;

  function handleReasonConfirm() {
    if (!reasonTarget) return;
    const { license, kind } = reasonTarget;
    const copy = REASON_COPY[kind];
    if (copy.required && !reasonNotes.trim()) return;
    setReasonTarget(null);
    runAction(async () => {
      const result = await copy.action(license.id, reasonNotes.trim());
      setReasonNotes("");
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
                  <th>Milling type</th>
                  <th>Requested capacity</th>
                  <th>Applied</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  <th></th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <React.Fragment key={l.id}>
                  <tr>
                    <td>{l.mill_name ?? "—"}</td>
                    <td>{l.mill_registration_no ?? "—"}</td>
                    <td>{l.license_no ?? "—"}</td>
                    <td>{l.milling_type ? MILLING_TYPE_LABEL[l.milling_type] : "—"}</td>
                    <td>{l.requested_capacity_mt_per_day ? `${Number(l.requested_capacity_mt_per_day).toLocaleString()} MT/day` : "—"}</td>
                    <td>{format(new Date(l.applied_date), "MMM d, yyyy")}</td>
                    <td>{l.expiry_date ? format(new Date(l.expiry_date), "MMM d, yyyy") : "—"}</td>
                    <td>
                      <span className={clsx(styles.badge, styles[STATUS_BADGE[l.status]])}>{l.status}</span>
                    </td>
                    <td>{l.reviewed_by_name ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                      >
                        {expandedId === l.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Details
                      </button>
                    </td>
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
                              onClick={() => { setReasonNotes(""); setReasonTarget({ license: l, kind: "reject" }); }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )}
                        {l.status === "approved" && (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Suspend"
                              title="Suspend"
                              disabled={isPending}
                              onClick={() => { setReasonNotes(""); setReasonTarget({ license: l, kind: "suspend" }); }}
                            >
                              <PauseCircle size={15} />
                            </button>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.rejectBtn)}
                              aria-label="Revoke"
                              title="Revoke"
                              disabled={isPending}
                              onClick={() => { setReasonNotes(""); setReasonTarget({ license: l, kind: "revoke" }); }}
                            >
                              <Ban size={15} />
                            </button>
                          </div>
                        )}
                        {l.status === "suspended" && (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.rejectBtn)}
                              aria-label="Revoke"
                              title="Revoke"
                              disabled={isPending}
                              onClick={() => { setReasonNotes(""); setReasonTarget({ license: l, kind: "revoke" }); }}
                            >
                              <Ban size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                  {expandedId === l.id && (
                    <tr>
                      <td colSpan={canWrite ? 10 : 9} style={{ background: "var(--sidebar-hover)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.5rem 0" }}>
                          <div><strong>Premises address:</strong> {l.premises_address || "—"}</div>
                          <div><strong>Justification:</strong> {l.justification || "—"}</div>
                          <div><strong>Contact number:</strong> {l.contact_number || "—"}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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

      {reasonTarget && (
        <div className={styles.overlay} onClick={() => setReasonTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{REASON_COPY[reasonTarget.kind].title}</h3>
            <textarea
              className={styles.textarea}
              placeholder={REASON_COPY[reasonTarget.kind].placeholder}
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setReasonTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleReasonConfirm}
                disabled={REASON_COPY[reasonTarget.kind].required && !reasonNotes.trim()}
              >
                {REASON_COPY[reasonTarget.kind].title}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
