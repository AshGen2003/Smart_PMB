"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { adminLogin, type AdminLoginState } from "@/app/actions/admin-auth";
import styles from "../AdminAuth.module.css";

const initialState: AdminLoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(
    adminLogin,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.card}>
      <div className={styles.badge}>
        <span className={styles.badgeIcon}>
          <ShieldCheck size={16} />
        </span>
        <span className={styles.badgeText}>Admin Portal</span>
      </div>

      <h1 className={styles.title}>Administrator sign in</h1>
      <p className={styles.subtitle}>
        Restricted access. Authorized personnel only.
      </p>

      {state.error && <div className={styles.banner}>{state.error}</div>}

      <form action={formAction} noValidate>
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
            placeholder="admin@smartpmb.com"
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className={styles.footerLine}>
        Not an admin? <Link href="/login">Go to the regular login</Link>
      </p>
    </div>
  );
}
