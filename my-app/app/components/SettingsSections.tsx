"use client";

import React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import { useTheme } from "./ThemeProvider";
import { PasswordInput } from "./PasswordInput";
import styles from "./SettingsSections.module.css";

const initialState: ProfileState = {};

export function AccountSettingsForm({
  fullName,
  email,
  nic = "",
  phoneNumber = "",
}: {
  fullName: string;
  email: string;
  nic?: string;
  phoneNumber?: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Account</h2>
      <p className={styles.cardSubtitle}>
        Update your name and contact details, or change your password. Your
        email address can only be changed by an administrator.
      </p>

      {state.error && (
        <div className={clsx(styles.banner, styles.bannerError)}>
          {state.error}
        </div>
      )}
      {state.success && (
        <div className={clsx(styles.banner, styles.bannerSuccess)}>
          {state.success}
        </div>
      )}

      <form action={formAction} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            defaultValue={fullName}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nic">
              NIC
            </label>
            <input
              id="nic"
              name="nic"
              type="text"
              defaultValue={nic}
              className={styles.input}
              placeholder="e.g. 200012345678"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="phoneNumber">
              Phone number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={phoneNumber}
              className={styles.input}
              placeholder="e.g. 0771234567"
            />
          </div>
        </div>

        <hr className={styles.divider} />

        <p className={styles.sectionLabel}>Change password (optional)</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="currentPassword">
            Current password
          </label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            className={styles.input}
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="newPassword">
              New password
            </label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
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
              minLength={8}
              className={styles.input}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={pending}>
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

export function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Appearance</h2>
      <p className={styles.cardSubtitle}>
        Choose how Smart PMB looks on this device.
      </p>

      <div className={styles.appearanceRow}>
        <div>
          <p className={styles.appearanceLabel}>Theme</p>
          <p className={styles.appearanceValue}>
            {theme === "dark" ? "Dark" : "Light"} mode
          </p>
        </div>
        <button
          type="button"
          className={styles.themeSwitch}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          Switch to {theme === "dark" ? "light" : "dark"}
        </button>
      </div>
    </div>
  );
}

export function AdminShortcutSettings() {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Administration</h2>
      <p className={styles.cardSubtitle}>
        Manage staff accounts, roles, and access across Smart PMB.
      </p>

      <div className={styles.shortcutRow}>
        <div>
          <p className={styles.appearanceLabel}>User management</p>
          <p className={styles.appearanceValue}>
            Create, edit, or deactivate accounts
          </p>
        </div>
        <Link href="/residents" className={styles.shortcutLink}>
          Go to Users →
        </Link>
      </div>
    </div>
  );
}
