/**
 * Client Component for the admin's system-change-request queue — the
 * "waiting list" the PMB officer's requests land on. Lists every request
 * (backend scopes admins to see all, see sysops/views.py's
 * SystemChangeRequestViewSet.get_queryset), with per-row Accept (set a
 * fee, which creates a Stripe Checkout Session for the officer to pay) /
 * Reject actions for pending requests, and a detail view with the
 * progress timeline plus a "post progress" form once a token has been
 * issued.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { Check, CreditCard, Eye, Loader2, Receipt, Trash2, X } from "lucide-react";
import {
  acceptSystemChangeRequest,
  deleteSystemChangeRequest,
  rejectSystemChangeRequest,
  postProgressUpdate,
} from "@/app/actions/systemRequests";
import StyledSelect from "@/app/components/StyledSelect";
import ProgressTimeline from "./ProgressTimeline";
import { STAGE_LABEL, STATUS_LABEL, type ProgressStage, type SystemRequestRow } from "./types";
import styles from "./SystemRequests.module.css";

const STATUS_BADGE: Record<SystemRequestRow["status"], string> = {
  pending: styles.badgeNeutral,
  payment_pending: styles.badgeWarning,
  token_issued: styles.badgeInfo,
  in_progress: styles.badgeInfo,
  completed: styles.badgeSuccess,
  rejected: styles.badgeDanger,
};

// A request only ever reaches "payment_pending" (or later) once an admin
// has accepted it and set a fee — accept() is only callable from PENDING,
// and rejection is also only possible from PENDING, so fee_amount being
// set and status being one of these three is the full, exhaustive set of
// "this has a real payment behind it" states (see sysops/models.py's
// SystemChangeRequest.Status for the full lifecycle).
const PAID_STATUSES: SystemRequestRow["status"][] = ["token_issued", "in_progress", "completed"];

function paymentStatusLabel(status: SystemRequestRow["status"]) {
  return PAID_STATUSES.includes(status) ? "Paid" : "Awaiting payment";
}

// A request can only be deleted while it has no fee on record (PENDING or
// REJECTED — see actions/systemRequests.ts's deleteSystemChangeRequest
// docstring), keeping the Payments & Tokens ledger's records intact.
function canDelete(r: SystemRequestRow) {
  return r.fee_amount === null;
}

export default function SystemRequestsManager({ requests }: { requests: SystemRequestRow[] }) {
  const [view, setView] = useState<"requests" | "payments">("requests");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acceptTarget, setAcceptTarget] = useState<SystemRequestRow | null>(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [rejectTarget, setRejectTarget] = useState<SystemRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailTarget, setDetailTarget] = useState<SystemRequestRow | null>(null);
  const [progressStage, setProgressStage] = useState<ProgressStage>("reviewing");
  const [progressNote, setProgressNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SystemRequestRow | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter]
  );

  // Payments & Tokens view — every request that has ever had a fee set,
  // newest first, regardless of the "Requests" tab's status filter.
  const paymentRecords = useMemo(
    () =>
      requests
        .filter((r) => r.fee_amount !== null)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()),
    [requests]
  );

  function submitAccept() {
    if (!acceptTarget || !feeAmount) return;
    const target = acceptTarget;
    setError(null);
    startTransition(async () => {
      const result = await acceptSystemChangeRequest(target.id, feeAmount);
      if (result.error) setError(result.error);
      else setAcceptTarget(null);
    });
  }

  function submitReject() {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setError(null);
    startTransition(async () => {
      const result = await rejectSystemChangeRequest(target.id, rejectReason.trim());
      if (result.error) setError(result.error);
      else setRejectTarget(null);
    });
  }

  function submitProgress() {
    if (!detailTarget) return;
    const target = detailTarget;
    setError(null);
    startTransition(async () => {
      const result = await postProgressUpdate(target.id, progressStage, progressNote.trim());
      if (result.error) setError(result.error);
      else setProgressNote("");
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    startTransition(async () => {
      const result = await deleteSystemChangeRequest(target.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDetailTarget(null);
      setDeleteSuccess(`"${target.title}" was deleted.`);
    });
  }

  const canPostProgress = detailTarget?.status === "token_issued" || detailTarget?.status === "in_progress";

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>System Change Requests</h1>
          <span className={styles.subtitle}>
            PMB officer requests to change or update the system — review, price, and track them.
          </span>
        </div>

        {view === "requests" && (
          <div className={styles.actions}>
            <StyledSelect
              fitContent
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                ...(Object.keys(STATUS_LABEL) as SystemRequestRow["status"][]).map((s) => ({
                  value: s,
                  label: STATUS_LABEL[s],
                })),
              ]}
            />
          </div>
        )}
      </div>

      <div className={styles.tabsRow}>
        <button
          type="button"
          className={clsx(styles.tab, view === "requests" && styles.tabActive)}
          onClick={() => setView("requests")}
        >
          <Receipt size={15} /> Requests
        </button>
        <button
          type="button"
          className={clsx(styles.tab, view === "payments" && styles.tabActive)}
          onClick={() => setView("payments")}
        >
          <CreditCard size={15} /> Payments &amp; Tokens
        </button>
      </div>

      {error && !acceptTarget && !rejectTarget && !detailTarget && !deleteTarget && (
        <div className={styles.banner}>{error}</div>
      )}
      {deleteSuccess && <div className={styles.successBanner}>{deleteSuccess}</div>}

      {view === "requests" && (
      <div className={styles.card}>
        {filtered.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Request</th>
                <th>Requested by</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.requested_by_name ?? "—"}</td>
                  <td>
                    <span className={clsx(styles.badge, STATUS_BADGE[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td>{r.fee_amount ? `Rs. ${Number(r.fee_amount).toLocaleString()}` : "—"}</td>
                  <td>{format(new Date(r.submitted_at), "MMM d, yyyy")}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        title="View details"
                        onClick={() => {
                          setError(null);
                          setProgressStage("reviewing");
                          setProgressNote("");
                          setDetailTarget(r);
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      {r.status === "pending" && (
                        <>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            title="Accept"
                            disabled={isPending}
                            onClick={() => {
                              setError(null);
                              setFeeAmount("");
                              setAcceptTarget(r);
                            }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                            title="Reject"
                            disabled={isPending}
                            onClick={() => {
                              setError(null);
                              setRejectReason("");
                              setRejectTarget(r);
                            }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {canDelete(r) && (
                        <button
                          type="button"
                          className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                          title="Delete"
                          disabled={isPending}
                          onClick={() => {
                            setError(null);
                            setDeleteSuccess(null);
                            setDeleteTarget(r);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>No requests match this filter.</p>
        )}
      </div>
      )}

      {view === "payments" && (
        <div className={styles.card}>
          {paymentRecords.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Request</th>
                  <th>Amount</th>
                  <th>Payment status</th>
                  <th>Token</th>
                  <th>Token issued</th>
                </tr>
              </thead>
              <tbody>
                {paymentRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.requested_by_name ?? "—"}</td>
                    <td>{r.title}</td>
                    <td>
                      {r.currency.toUpperCase()} {Number(r.fee_amount).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={clsx(
                          styles.badge,
                          PAID_STATUSES.includes(r.status) ? styles.badgeSuccess : styles.badgeWarning
                        )}
                      >
                        {paymentStatusLabel(r.status)}
                      </span>
                    </td>
                    <td>{r.token ? <span className={styles.token}>{r.token}</span> : "—"}</td>
                    <td>
                      {r.token_issued_at ? format(new Date(r.token_issued_at), "MMM d, yyyy · h:mm a") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.emptyState}>No payments recorded yet.</p>
          )}
        </div>
      )}

      {acceptTarget && (
        <div className={styles.overlay} onClick={() => setAcceptTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Receipt size={20} />
                Accept — {acceptTarget.title}
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setAcceptTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.modalBanner}>{error}</div>}
              <p className={styles.subtitle}>
                Setting a fee creates a Stripe Checkout Session — the officer will need to pay it
                before a token is issued.
              </p>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="feeAmount">Fee amount (LKR)</label>
                <input
                  id="feeAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.input}
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setAcceptTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  disabled={isPending || !feeAmount}
                  onClick={submitAccept}
                >
                  {isPending && <Loader2 size={16} className={styles.spin} />}
                  Accept &amp; create payment link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className={styles.overlay} onClick={() => setRejectTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <X size={20} />
                Reject — {rejectTarget.title}
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setRejectTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.modalBanner}>{error}</div>}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="rejectReason">
                  Reason <span className={styles.optional}>(shown to the officer)</span>
                </label>
                <textarea
                  id="rejectReason"
                  className={styles.textarea}
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Out of scope for this quarter."
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setRejectTarget(null)}>
                  Cancel
                </button>
                <button type="button" className={styles.primaryBtn} disabled={isPending} onClick={submitReject}>
                  {isPending && <Loader2 size={16} className={styles.spin} />}
                  Reject request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className={styles.overlay} onClick={() => setDetailTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Receipt size={20} />
                {detailTarget.title}
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setDetailTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.modalBanner}>{error}</div>}

              <p className={styles.subtitle}>{detailTarget.description}</p>

              <div className={styles.field}>
                <span className={clsx(styles.badge, STATUS_BADGE[detailTarget.status])}>
                  {STATUS_LABEL[detailTarget.status]}
                </span>
                {detailTarget.fee_amount && (
                  <span className={styles.subtitle}>
                    {" "}
                    · Fee: Rs. {Number(detailTarget.fee_amount).toLocaleString()}
                  </span>
                )}
              </div>

              {detailTarget.token && (
                <div className={styles.field}>
                  <span className={styles.label}>Token</span>
                  <div className={styles.token}>{detailTarget.token}</div>
                </div>
              )}

              {detailTarget.rejection_reason && (
                <div className={styles.field}>
                  <span className={styles.label}>Rejection reason</span>
                  <p className={styles.subtitle}>{detailTarget.rejection_reason}</p>
                </div>
              )}

              <h3 className={styles.cardTitle} style={{ marginTop: "1.25rem" }}>Progress</h3>
              <ProgressTimeline updates={detailTarget.progress_updates} />

              {canPostProgress && (
                <>
                  <h3 className={styles.cardTitle} style={{ marginTop: "1.25rem" }}>Post an update</h3>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="progressStage">Stage</label>
                    <StyledSelect
                      id="progressStage"
                      value={progressStage}
                      onChange={(v) => setProgressStage(v as ProgressStage)}
                      options={(Object.keys(STAGE_LABEL) as ProgressStage[]).map((s) => ({
                        value: s,
                        label: STAGE_LABEL[s],
                      }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="progressNote">
                      Note <span className={styles.optional}>(optional)</span>
                    </label>
                    <textarea
                      id="progressNote"
                      className={styles.textarea}
                      rows={3}
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={isPending}
                      onClick={submitProgress}
                    >
                      {isPending && <Loader2 size={16} className={styles.spin} />}
                      Post update
                    </button>
                  </div>
                </>
              )}

              {canDelete(detailTarget) && (
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                    onClick={() => {
                      setError(null);
                      setDeleteSuccess(null);
                      setDeleteTarget(detailTarget);
                    }}
                  >
                    <Trash2 size={14} /> Delete request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={() => !isPending && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Trash2 size={20} />
                Delete request
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {error && <div className={styles.modalBanner}>{error}</div>}
              <p>
                Delete <strong>{deleteTarget.title}</strong> (requested by{" "}
                {deleteTarget.requested_by_name ?? "—"})? This cannot be undone.
              </p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setDeleteTarget(null)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button type="button" className={styles.primaryBtn} disabled={isPending} onClick={confirmDelete}>
                  {isPending && <Loader2 size={16} className={styles.spin} />}
                  Delete request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
