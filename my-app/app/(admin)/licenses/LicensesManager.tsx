/**
 * Client Component for the licensing-application review queue: filter by
 * status, and per-row Approve / Reject (with a reason) actions. Applications
 * are entirely self-submitted (see (auth)/signup/partner) — there's no
 * create/edit form here, just decisions.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { Check, Loader2, X } from "lucide-react";
import { approveLicense, rejectLicense } from "@/app/actions/licenses";
import StyledSelect from "@/app/components/StyledSelect";
import ConfirmModal from "@/app/components/ConfirmModal";
import styles from "../residents/Users.module.css";

/** Shape of an application row as returned by `GET /api/admin/license-applications/`. */
export type LicenseApplicationRow = {
  id: number;
  applicant_name: string;
  applicant_email: string;
  license_type: "authorized_purchaser" | "mill_owner";
  license_type_display: string;
  business_name: string;
  business_registration_no: string;
  contact_number: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string;
};

const STATUS_BADGE: Record<LicenseApplicationRow["status"], string> = {
  pending: styles["badge-neutral"],
  approved: styles["badge-success"],
  rejected: styles["badge-danger"],
};

export default function LicensesManager({
  applications,
  canWrite = true,
}: {
  applications: LicenseApplicationRow[];
  // False for viewers who can see applications but not decide them (e.g. a
  // monitor_operations-only officer viewing the merged /licenses page's
  // Mill License tab) — hides the Approve/Reject actions.
  canWrite?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectTarget, setRejectTarget] = useState<LicenseApplicationRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? applications
        : applications.filter((a) => a.status === statusFilter),
    [applications, statusFilter]
  );

  const [approveTarget, setApproveTarget] = useState<LicenseApplicationRow | null>(null);

  function handleApprove(application: LicenseApplicationRow) {
    setApproveTarget(application);
  }

  function confirmApprove() {
    if (!approveTarget) return;
    const target = approveTarget;
    setError(null);
    startTransition(async () => {
      const result = await approveLicense(target.id);
      if (result.error) setError(result.error);
      setApproveTarget(null);
    });
  }

  function openReject(application: LicenseApplicationRow) {
    setError(null);
    setRejectReason("");
    setRejectTarget(application);
  }

  function submitReject() {
    if (!rejectTarget) return;
    const target = rejectTarget;

    setError(null);
    startTransition(async () => {
      const result = await rejectLicense(target.id, rejectReason.trim());
      if (result.error) setError(result.error);
      else setRejectTarget(null);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Licensing Applications</h1>
          <span className={styles.subtitle}>
            Authorized purchasers and mill owners requesting access
          </span>
        </div>

        <div className={styles.actions}>
          <StyledSelect
            fitContent
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
      </div>

      {error && <div className={styles.banner}>{error}</div>}

      <div className={styles.card}>
        {filtered.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Business</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.applicant_name}
                    <div className={styles.subtitle}>{a.applicant_email}</div>
                  </td>
                  <td>
                    {a.business_name}
                    <div className={styles.subtitle}>{a.business_registration_no}</div>
                  </td>
                  <td>{a.license_type_display}</td>
                  <td>
                    <span className={clsx(styles.badge, STATUS_BADGE[a.status])}>
                      {a.status}
                    </span>
                    {a.status === "rejected" && a.rejection_reason && (
                      <div className={styles.subtitle}>{a.rejection_reason}</div>
                    )}
                  </td>
                  <td>{format(new Date(a.submitted_at), "MMM d, yyyy")}</td>
                  <td>
                    {canWrite && a.status === "pending" && (
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Approve application"
                          title="Approve"
                          disabled={isPending}
                          onClick={() => handleApprove(a)}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                          aria-label="Reject application"
                          title="Reject"
                          disabled={isPending}
                          onClick={() => openReject(a)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>No applications match this filter.</p>
        )}
      </div>

      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Reject application</h2>

            {error && <div className={styles.banner}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="rejectReason">
                Reason <span className={styles.optional}>(shown to the applicant)</span>
              </label>
              <textarea
                id="rejectReason"
                className={styles.input}
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Business registration number could not be verified."
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setRejectTarget(null)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={submitReject}
                disabled={isPending}
              >
                {isPending && <Loader2 size={16} className={styles.spin} />}
                {isPending ? "Rejecting…" : "Reject application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {approveTarget && (
        <ConfirmModal
          title="Approve this application?"
          message={
            <>
              Approve <strong>{approveTarget.business_name}</strong>&apos;s application?
            </>
          }
          confirmLabel="Approve"
          pendingLabel="Approving…"
          variant="warning"
          pending={isPending}
          onConfirm={confirmApprove}
          onClose={() => setApproveTarget(null)}
        />
      )}
    </div>
  );
}
