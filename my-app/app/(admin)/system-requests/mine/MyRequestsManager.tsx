/**
 * Client Component for a PMB officer's own system-change requests: submit
 * a new one (title/description — the admin sets the fee later, on
 * accept), and browse past requests with their status/token/progress.
 * Once a request is `payment_pending`, a "Pay Now" button redirects to
 * Stripe's hosted Checkout page (see actions/systemRequests.ts's
 * payForSystemChangeRequest).
 */
"use client";

import React, { useEffect, useRef, useState, useTransition, useActionState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { CreditCard, Eye, Loader2, Plus, Receipt, Trash2, X } from "lucide-react";
import {
  cancelExpiredPayment,
  createSystemChangeRequest,
  deleteSystemChangeRequest,
  payForSystemChangeRequest,
  type SystemRequestFormState,
} from "@/app/actions/systemRequests";
import ProgressTimeline from "../ProgressTimeline";
import { STATUS_LABEL, type SystemRequestRow } from "../types";
import styles from "../SystemRequests.module.css";

const STATUS_BADGE: Record<SystemRequestRow["status"], string> = {
  pending: styles.badgeNeutral,
  payment_pending: styles.badgeWarning,
  token_issued: styles.badgeInfo,
  in_progress: styles.badgeInfo,
  completed: styles.badgeSuccess,
  rejected: styles.badgeDanger,
};

const initialState: SystemRequestFormState = {};

// A request can only be deleted while it has no fee on record (PENDING or
// REJECTED — accept() is the only thing that ever sets fee_amount, see
// actions/systemRequests.ts's deleteSystemChangeRequest docstring).
function canDelete(r: SystemRequestRow) {
  return r.fee_amount === null;
}

function PayNowButton({ requestId }: { requestId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && <div className={styles.banner}>{error}</div>}
      <button
        type="button"
        className={styles.primaryBtn}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await payForSystemChangeRequest(requestId);
            // payForSystemChangeRequest only returns on failure — success
            // redirects away before this line would ever run.
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? <Loader2 size={16} className={styles.spin} /> : <CreditCard size={16} />}
        Pay Now
      </button>
    </div>
  );
}

// Only actually cancels if Stripe confirms the session has expired — see
// cancelExpiredPayment's docstring. Shown alongside Pay Now for anyone
// whose payment window may have lapsed rather than trying to guess that
// client-side; clicking it too early just surfaces the backend's "hasn't
// expired yet" error instead of doing anything.
function CancelExpiredPaymentButton({
  requestId,
  onCancelled,
}: {
  requestId: number;
  onCancelled: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && <div className={styles.banner}>{error}</div>}
      <button
        type="button"
        className={styles.secondaryBtn}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelExpiredPayment(requestId);
            if (result.error) setError(result.error);
            else onCancelled();
          })
        }
      >
        {isPending ? <Loader2 size={16} className={styles.spin} /> : <X size={16} />}
        Cancel expired payment
      </button>
    </div>
  );
}

export default function MyRequestsManager({
  requests,
  paymentBanner,
}: {
  requests: SystemRequestRow[];
  paymentBanner: "success" | "cancelled" | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [detailTarget, setDetailTarget] = useState<SystemRequestRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemRequestRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [state, formAction, pending] = useActionState(createSystemChangeRequest, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      setShowForm(false);
      wasSubmitting.current = false;
    }
  }, [pending, state]);

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteSystemChangeRequest(target.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDetailTarget(null);
      setDeleteSuccess(`"${target.title}" was deleted.`);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>My System Change Requests</h1>
          <span className={styles.subtitle}>
            Request a system change or update — an admin will review it and, if accepted, set a
            fee to pay before a token is issued.
          </span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} /> New request
          </button>
        </div>
      </div>

      {paymentBanner === "success" && (
        <div className={styles.successBanner}>
          Payment received — your token will appear here shortly once it&apos;s confirmed.
        </div>
      )}
      {paymentBanner === "cancelled" && (
        <div className={styles.banner}>Payment was cancelled — you can try again below.</div>
      )}
      {deleteSuccess && <div className={styles.successBanner}>{deleteSuccess}</div>}
      {cancelSuccess && <div className={styles.successBanner}>{cancelSuccess}</div>}

      <div className={styles.card}>
        {requests.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Request</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
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
                        onClick={() => setDetailTarget(r)}
                      >
                        <Eye size={14} />
                      </button>
                      {canDelete(r) && (
                        <button
                          type="button"
                          className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                          title="Delete"
                          onClick={() => {
                            setDeleteError(null);
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
          <p className={styles.emptyState}>You haven&apos;t submitted any requests yet.</p>
        )}
      </div>

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Receipt size={20} />
                New system change request
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {state.error && <div className={styles.modalBanner}>{state.error}</div>}
              <form action={formAction}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="title">Title</label>
                  <input id="title" name="title" type="text" required className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={5}
                    className={styles.textarea}
                    placeholder="What system change or update are you requesting, and why?"
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.primaryBtn} disabled={pending}>
                    {pending && <Loader2 size={16} className={styles.spin} />}
                    Submit request
                  </button>
                </div>
              </form>
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

              {detailTarget.status === "payment_pending" && (
                <div className={styles.field}>
                  <PayNowButton requestId={detailTarget.id} />
                  <CancelExpiredPaymentButton
                    requestId={detailTarget.id}
                    onCancelled={() => {
                      const title = detailTarget.title;
                      setDetailTarget(null);
                      setDeleteSuccess(null);
                      setCancelSuccess(`"${title}" was cancelled — its payment window expired.`);
                    }}
                  />
                </div>
              )}

              {detailTarget.token && (
                <div className={styles.field}>
                  <span className={styles.label}>Token</span>
                  <div className={styles.token}>{detailTarget.token}</div>
                </div>
              )}

              {detailTarget.rejection_reason && (
                <div className={styles.field}>
                  <span className={styles.label}>Reason</span>
                  <p className={styles.subtitle}>{detailTarget.rejection_reason}</p>
                </div>
              )}

              <h3 className={styles.cardTitle} style={{ marginTop: "1.25rem" }}>Progress</h3>
              <ProgressTimeline updates={detailTarget.progress_updates} />

              {canDelete(detailTarget) && (
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                    onClick={() => {
                      setDeleteError(null);
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
        <div className={styles.overlay} onClick={() => !isDeleting && setDeleteTarget(null)}>
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
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {deleteError && <div className={styles.modalBanner}>{deleteError}</div>}
              <p>
                Delete <strong>{deleteTarget.title}</strong>? This cannot be undone.
              </p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button type="button" className={styles.primaryBtn} disabled={isDeleting} onClick={confirmDelete}>
                  {isDeleting && <Loader2 size={16} className={styles.spin} />}
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
