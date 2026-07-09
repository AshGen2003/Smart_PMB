"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { login, type FormState } from "@/app/actions/auth";
import styles from "../AuthForm.module.css";

const initialState: FormState = {};

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
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

      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.subtitle}>Log in to your Smart PMB account.</p>

      {justRegistered && !state.error && (
        <div className={clsx(styles.banner, styles.bannerSuccess)}>
          Account created! Check your email for a confirmation link, then log
          in below.
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
            Email
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
          <label className={styles.label} htmlFor="password">
            Password
          </label>
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
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className={styles.switchLine}>
        Farmer without an account? <Link href="/signup/farmer">Sign up</Link>
      </p>
    </div>
  );
}
