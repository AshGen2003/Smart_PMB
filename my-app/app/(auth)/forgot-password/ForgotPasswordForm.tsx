/**
 * Form for the `/forgot-password` page: a two-step, single-page flow.
 * Step 1 asks for the account email and a delivery channel (email or SMS
 * to whatever phone number is on file), then requests a one-time code via
 * the `requestPasswordReset` Server Action. Step 2 asks for that code plus
 * a new password, submitted via `verifyResetOtp`. Always shows the same
 * generic success message after step 1 regardless of whether the address
 * is actually registered or has a phone on file — same anti-enumeration
 * reasoning as the Django endpoint behind it (see accounts/views.py's
 * ForgotPasswordView).
 */
"use client";

import React, { startTransition, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import {
  requestPasswordReset,
  verifyResetOtp,
  type FormState,
} from "@/app/actions/auth";
import styles from "../AuthForm.module.css";

const initialState: FormState = {};

type Channel = "email" | "sms";

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [showPassword, setShowPassword] = useState(false);

  const [requestState, requestAction, requestPending] = useActionState(
    requestPasswordReset,
    initialState
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyResetOtp,
    initialState
  );
  const wasRequesting = useRef(false);

  // Advance to the code-entry step once the request succeeds (no error) —
  // same "watch pending -> false with no error" pattern used throughout
  // this app's forms.
  useEffect(() => {
    if (requestPending) wasRequesting.current = true;
    if (!requestPending && wasRequesting.current && !requestState.error) {
      setStep("verify");
      wasRequesting.current = false;
    }
  }, [requestPending, requestState]);

  function handleRequestSubmit(formData: FormData) {
    setEmail(String(formData.get("email") ?? "").trim());
    setChannel(String(formData.get("channel") ?? "email") as Channel);
    requestAction(formData);
  }

  function handleResend() {
    const formData = new FormData();
    formData.set("email", email);
    formData.set("channel", channel);
    startTransition(() => {
      requestAction(formData);
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.mobileLogoRow}>
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span>Smart PMB</span>
      </div>

      {step === "request" ? (
        <>
          <h1 className={styles.title}>Forgot your password?</h1>
          <p className={styles.subtitle}>
            Enter your account email and choose where to receive your reset code.
          </p>

          {requestState.error && (
            <div className={clsx(styles.banner, styles.bannerError)}>{requestState.error}</div>
          )}

          <form action={handleRequestSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={email}
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Send the code via</label>
              <div className={styles.channelRow}>
                <label className={styles.channelOption}>
                  <input type="radio" name="channel" value="email" defaultChecked />
                  Email
                </label>
                <label className={styles.channelOption}>
                  <input type="radio" name="channel" value="sms" />
                  SMS (phone number on file)
                </label>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={requestPending}>
              {requestPending && <Loader2 size={16} className={styles.spin} />}
              {requestPending ? "Sending…" : "Send code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className={styles.title}>Enter your code</h1>
          <p className={styles.subtitle}>
            If that account exists, a code was sent to it. Enter it below along with a new
            password.
          </p>

          {verifyState.error && (
            <div className={clsx(styles.banner, styles.bannerError)}>{verifyState.error}</div>
          )}

          <form action={verifyAction} noValidate>
            <input type="hidden" name="email" value={email} />

            <div className={styles.field}>
              <label className={styles.label} htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                className={styles.input}
                placeholder="123456"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">
                New password
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className={clsx(styles.input, styles.inputWithToggle)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className={styles.visibilityToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                className={styles.input}
                placeholder="Repeat password"
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={verifyPending}>
              {verifyPending && <Loader2 size={16} className={styles.spin} />}
              {verifyPending ? "Resetting…" : "Reset password"}
            </button>
          </form>

          <p className={styles.switchLine}>
            <button
              type="button"
              className={styles.inlineLink}
              onClick={handleResend}
              disabled={requestPending}
            >
              Resend code
            </button>
            {" · "}
            <button
              type="button"
              className={styles.inlineLink}
              onClick={() => setStep("request")}
            >
              Use a different email
            </button>
          </p>
        </>
      )}

      <p className={styles.switchLine}>
        <Link href="/login">Back to login</Link>
      </p>
    </div>
  );
}
