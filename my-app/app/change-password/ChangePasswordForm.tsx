/**
 * Forced password-change form shown when the current account has
 * must_change_password set (an admin-created or admin-reset account —
 * see accounts/views.py's AdminUserWriteSerializer). Reuses the same
 * updateProfile Server Action as the normal Settings page — it already
 * clears must_change_password server-side the moment a new password is
 * set (see SelfProfileSerializer.save()) — with a hidden `fullName` field
 * so that action's "full name can't be empty" validation still passes even
 * though this form doesn't show a name field of its own.
 */
"use client";

import React, { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import { PasswordInput } from "@/app/components/PasswordInput";
import styles from "../(auth)/AuthForm.module.css";

const initialState: ProfileState = {};

export default function ChangePasswordForm({
  fullName,
  homeHref,
}: {
  fullName: string;
  homeHref: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const router = useRouter();

  // updateProfile doesn't redirect (the Settings page stays put on
  // success) — here, once the password is actually changed, move on to
  // wherever this account's real portal is.
  useEffect(() => {
    if (state.success) {
      router.push(homeHref);
    }
  }, [state.success, homeHref, router]);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Set a new password</h1>
      <p className={styles.subtitle}>
        Your account was created with a temporary password. Set your own
        before continuing.
      </p>

      {state.error && (
        <div className={clsx(styles.banner, styles.bannerError)}>
          {state.error}
        </div>
      )}

      <form action={formAction} noValidate>
        <input type="hidden" name="fullName" value={fullName} />

        <div className={styles.field}>
          <label className={styles.label} htmlFor="currentPassword">
            Temporary password
          </label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="newPassword">
            New password
          </label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            className={styles.input}
            placeholder="At least 8 characters"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Saving…" : "Set password and continue"}
        </button>
      </form>
    </div>
  );
}
