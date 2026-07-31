/**
 * Authorized purchaser self-registration form: just credentials and a
 * name — no domain profile fields. Submits via the
 * `signupAuthorizedPurchaser` Server Action, which creates the account and
 * sends a confirmation email. Mirrors SignupTransportOperatorForm.tsx.
 */
"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { signupAuthorizedPurchaser, type SignupState } from "@/app/actions/auth";
import styles from "../../AuthForm.module.css";

const initialState: SignupState = {};

export default function SignupAuthorizedPurchaserForm() {
  const [state, formAction, pending] = useActionState(
    signupAuthorizedPurchaser,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={clsx(styles.card, styles.cardWide)}>
      <div className={styles.mobileLogoRow}>
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span>Smart PMB</span>
      </div>

      <h1 className={styles.title}>Create your authorized purchaser account</h1>
      <p className={styles.subtitle}>
        Record and track rice purchase requests against warehouse stock with Smart PMB.
      </p>

      {state.error && (
        <div className={clsx(styles.banner, styles.bannerError)}>
          {state.error}
        </div>
      )}

      <form action={formAction} noValidate>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className={styles.input}
              placeholder="K. A. Perera"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="contactNumber">
              Contact number
            </label>
            <input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              required
              className={styles.input}
              placeholder="0771234567"
            />
          </div>
        </div>

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

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                name="password"
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
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className={styles.switchLine}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
