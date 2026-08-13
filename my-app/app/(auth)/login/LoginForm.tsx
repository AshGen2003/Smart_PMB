/**
 * Login form for the `/login` page. Submits email/password via the
 * `login` Server Action, which sets the JWT httpOnly cookie and redirects
 * on success (redirect target depends on the user's role: admin/officer
 * shell vs. farmer portal).
 */
"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { login, type FormState } from "@/app/actions/auth";
import { useLanguage } from "@/app/components/LanguageProvider";
import styles from "../AuthForm.module.css";

const initialState: FormState = {};

/**
 * Wraps the actual form in Suspense because it reads `useSearchParams()`
 * (to detect the `?registered=1` / `?applied=1` flags from a just-completed
 * signup), which requires a Suspense boundary during static rendering.
 */
export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

/** Renders the email/password fields, a post-signup success banner, and error banner from a failed login attempt. */
function LoginFormInner() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const justApplied = searchParams.get("applied") === "1";
  const justReset = searchParams.get("reset") === "1";
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the email/password fields on every fresh load (this effect also
  // runs on mount, undoing anything the browser restored on refresh) and
  // after every attempt — a successful login navigates away before this
  // matters, a failed one shouldn't leave the typed credentials behind.
  useEffect(() => {
    formRef.current?.reset();
  }, [state]);

  return (
    <div className={styles.card}>
      <div className={styles.mobileLogoRow}>
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span>Smart PMB</span>
      </div>

      <h1 className={styles.title}>{t.login.title}</h1>
      <p className={styles.subtitle}>{t.login.subtitle}</p>

      {justRegistered && !state.error && (
        <div className={clsx(styles.banner, styles.bannerSuccess)}>
          {t.login.registeredBanner}
        </div>
      )}

      {justApplied && !state.error && (
        <div className={clsx(styles.banner, styles.bannerSuccess)}>
          {t.login.appliedBanner}
        </div>
      )}

      {justReset && !state.error && (
        <div className={clsx(styles.banner, styles.bannerSuccess)}>
          {t.login.resetBanner}
        </div>
      )}

      {state.error && (
        <div className={clsx(styles.banner, styles.bannerError)}>
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} autoComplete="off" noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            {t.login.emailLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={styles.input}
            placeholder="you@example.com"
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">
              {t.login.passwordLabel}
            </label>
            <Link href="/forgot-password" className={styles.inlineLink}>
              {t.login.forgotPassword}
            </Link>
          </div>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className={clsx(styles.input, styles.inputWithToggle)}
              placeholder="••••••••"
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

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? t.login.loggingIn : t.login.submit}
        </button>
      </form>

      <p className={styles.switchLine}>
        {t.login.farmerPrompt} <Link href="/signup/farmer">{t.login.signUp}</Link>
      </p>
      <p className={styles.switchLine}>
        {t.login.partnerPrompt}{" "}
        <Link href="/signup/partner">{t.login.applyLicense}</Link>
      </p>
    </div>
  );
}
