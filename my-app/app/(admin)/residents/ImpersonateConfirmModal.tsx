/**
 * Confirmation modal shown before impersonating a user, replacing a plain
 * window.confirm() with an app-styled modal centered over the page
 * (matching the warning dialog shown once impersonation actually starts —
 * see components/ImpersonationBanner.tsx).
 *
 * Normal path is two steps: "request" (admin asks for a code, emailed to
 * the account holder) then "verify" (admin enters the code the account
 * holder relayed back). A third step, "override" — reachable only if
 * `canOverride` is true — skips the code entirely given a written reason,
 * for accounts the holder can't be reached to grant consent through. See
 * actions/impersonation.ts for the corresponding calls.
 */
"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, Mail, UserCog, X } from "lucide-react";
import styles from "./Users.module.css";

type Step = "request" | "verify" | "override";

export default function ImpersonateConfirmModal({
  email,
  canOverride,
  onRequestCode,
  onConfirm,
  onOverride,
  onClose,
}: {
  email: string;
  canOverride: boolean;
  onRequestCode: () => Promise<{ error?: string }>;
  onConfirm: (code: string) => Promise<{ error?: string } | void>;
  onOverride: (reason: string) => Promise<{ error?: string } | void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("request");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRequestCode() {
    setPending(true);
    setError(null);
    const result = await onRequestCode();
    setPending(false);
    if (result.error) setError(result.error);
    else setStep("verify");
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);
    // Redirects on success (never returns) — only returns here on failure.
    const result = await onConfirm(code);
    setPending(false);
    if (result?.error) setError(result.error);
  }

  async function handleOverride() {
    setPending(true);
    setError(null);
    // Redirects on success (never returns) — only returns here on failure.
    const result = await onOverride(reason.trim());
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.impersonateModalIcon}>
          {step === "request" && <UserCog size={22} />}
          {step === "verify" && <Mail size={22} />}
          {step === "override" && <AlertTriangle size={22} />}
        </div>

        {step === "request" && (
          <>
            <h2 className={styles.modalTitle}>Impersonate this account?</h2>
            <p className={styles.deleteModalBody}>
              You&apos;re about to request access to sign in as <strong>{email}</strong>&apos;s real
              account, with real write access. They&apos;ll be emailed a one-time code — you&apos;ll
              need them to share it with you before you can continue. This is logged either way.
            </p>
          </>
        )}

        {step === "verify" && (
          <>
            <h2 className={styles.modalTitle}>Enter the code</h2>
            <p className={styles.deleteModalBody}>
              We&apos;ve emailed a one-time code to <strong>{email}</strong>. Ask them for it and
              enter it below to sign in as their account.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              className={styles.searchInput}
              style={{ width: "100%", textAlign: "center", letterSpacing: "0.3em", fontSize: "1.1rem" }}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={pending}
              autoFocus
            />
          </>
        )}

        {step === "override" && (
          <>
            <h2 className={styles.modalTitle}>Override without a code?</h2>
            <p className={styles.deleteModalBody}>
              This skips <strong>{email}</strong>&apos;s consent step entirely — only do this if
              they genuinely can&apos;t be reached. Requires a reason, which is logged and included
              in the notice they&apos;ll still receive afterward.
            </p>
            <textarea
              placeholder="Why can't they confirm this themselves?"
              className={styles.searchInput}
              style={{ width: "100%", minHeight: "72px", resize: "vertical", paddingTop: "0.6rem" }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              autoFocus
            />
          </>
        )}

        {error && <div className={styles.banner}>{error}</div>}

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          {step === "request" && (
            <button type="button" className={styles.primaryBtn} onClick={handleRequestCode} disabled={pending}>
              {pending && <Loader2 size={16} className={styles.spin} />}
              {pending ? "Sending…" : "Send code"}
            </button>
          )}
          {step === "verify" && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleConfirm}
              disabled={pending || code.length !== 6}
            >
              {pending && <Loader2 size={16} className={styles.spin} />}
              {pending ? "Signing in…" : "Impersonate"}
            </button>
          )}
          {step === "override" && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleOverride}
              disabled={pending || reason.trim().length === 0}
            >
              {pending && <Loader2 size={16} className={styles.spin} />}
              {pending ? "Signing in…" : "Override & impersonate"}
            </button>
          )}
        </div>

        {step === "verify" && (
          <button type="button" className={styles.resendCodeBtn} onClick={handleRequestCode} disabled={pending}>
            Resend code
          </button>
        )}

        {canOverride && step !== "override" && (
          <button
            type="button"
            className={styles.resendCodeBtn}
            onClick={() => {
              setError(null);
              setStep("override");
            }}
            disabled={pending}
          >
            Can&apos;t reach them? Override instead
          </button>
        )}
        {step === "override" && (
          <button
            type="button"
            className={styles.resendCodeBtn}
            onClick={() => {
              setError(null);
              setStep("request");
            }}
            disabled={pending}
          >
            Back to the normal flow
          </button>
        )}

        <button
          type="button"
          className={styles.iconBtn}
          style={{ position: "absolute", top: "1rem", right: "1rem" }}
          onClick={onClose}
          aria-label="Close"
          disabled={pending}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
