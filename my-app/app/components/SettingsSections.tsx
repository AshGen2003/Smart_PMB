/**
 * Reusable settings-page sections shared by both the admin settings page
 * (`(admin)/settings/page.tsx`) and the farmer settings page
 * (`farmer/settings/page.tsx`): account details form, appearance/theme
 * toggle, and an admin-only shortcuts card.
 */
"use client";

import React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import {
  updateNotificationPreferences,
  type NotificationPreferencesState,
} from "@/app/actions/notifications";
import { useTheme } from "./ThemeProvider";
import { useLanguage, type Language } from "./LanguageProvider";
import StyledSelect from "./StyledSelect";
import { PasswordInput } from "./PasswordInput";
import { HelpFaq } from "./HelpFaq";
import { APP_VERSION } from "@/app/lib/appInfo";
import styles from "./SettingsSections.module.css";

const initialState: ProfileState = {};
const initialNotificationState: NotificationPreferencesState = {};

/**
 * Form for editing name/NIC/phone and optionally changing password (all
 * three password fields are optional — leaving them blank keeps the
 * current password). Email is shown but always disabled, since only an
 * admin can change a user's email address. Submits via the `updateProfile`
 * Server Action.
 */
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
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsAccount.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsAccount.subtitle}</p>

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
            {t.settingsAccount.emailLabel}
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
            {t.settingsAccount.fullNameLabel}
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
              {t.settingsAccount.nicLabel}
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
              {t.settingsAccount.phoneLabel}
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

        <p className={styles.sectionLabel}>{t.settingsAccount.changePassword}</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="currentPassword">
            {t.settingsAccount.currentPassword}
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
              {t.settingsAccount.newPassword}
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
              {t.settingsAccount.confirmPassword}
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
          {pending ? t.settingsAccount.saving : t.settingsAccount.save}
        </button>
      </form>
    </div>
  );
}

/** Card with a single toggle button for switching between light and dark theme, backed by ThemeProvider's context. */
export function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsAppearance.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsAppearance.subtitle}</p>

      <div className={styles.appearanceRow}>
        <div>
          <p className={styles.appearanceLabel}>{t.settingsAppearance.theme}</p>
          <p className={styles.appearanceValue}>
            {theme === "dark" ? t.settingsAppearance.dark : t.settingsAppearance.light} {t.settingsAppearance.mode}
          </p>
        </div>
        <button
          type="button"
          className={styles.themeSwitch}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {t.settingsAppearance.switchTo} {theme === "dark" ? t.settingsAppearance.light : t.settingsAppearance.dark}
        </button>
      </div>
    </div>
  );
}

/** Card with a select for switching the display language, backed by LanguageProvider's context. */
export function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsLanguage.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsLanguage.subtitle}</p>

      <div className={styles.appearanceRow}>
        <div>
          <p className={styles.appearanceLabel}>{t.settingsLanguage.label}</p>
        </div>
        <StyledSelect
          value={language}
          onChange={(v) => setLanguage(v as Language)}
          fitContent
          options={[
            { value: "en", label: t.settingsLanguage.english },
            { value: "si", label: t.settingsLanguage.sinhala },
          ]}
        />
      </div>
    </div>
  );
}

/**
 * Card with a toggle for the notification bell's message alerts, plus (for
 * farmers only) toggles for harvest-status-update notifications and their
 * SMS fallback. `notifyHarvestUpdates`/`notifyViaSms` are `null` for any
 * non-farmer account — those toggles are omitted entirely rather than shown
 * disabled, since they have no meaning for them.
 */
export function NotificationSettings({
  notifyMessages,
  notifyHarvestUpdates,
  notifyViaSms,
}: {
  notifyMessages: boolean;
  notifyHarvestUpdates: boolean | null;
  notifyViaSms: boolean | null;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferences,
    initialNotificationState
  );

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsNotifications.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsNotifications.subtitle}</p>

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
        <label className={clsx(styles.appearanceRow, styles.toggleRow)}>
          <div>
            <p className={styles.appearanceLabel}>{t.settingsNotifications.messageAlerts}</p>
            <p className={styles.appearanceValue}>{t.settingsNotifications.messageAlertsDesc}</p>
          </div>
          <span className={styles.switchTrack}>
            <input
              type="checkbox"
              name="notify_in_app_messages"
              defaultChecked={notifyMessages}
              className={styles.switchInput}
            />
            <span className={styles.switchSlider} />
          </span>
        </label>

        {notifyHarvestUpdates !== null && (
          <>
            <hr className={styles.divider} />
            <label className={clsx(styles.appearanceRow, styles.toggleRow)}>
              <div>
                <p className={styles.appearanceLabel}>{t.settingsNotifications.harvestUpdates}</p>
                <p className={styles.appearanceValue}>{t.settingsNotifications.harvestUpdatesDesc}</p>
              </div>
              <span className={styles.switchTrack}>
                <input
                  type="checkbox"
                  name="notify_harvest_updates"
                  defaultChecked={notifyHarvestUpdates}
                  className={styles.switchInput}
                />
                <span className={styles.switchSlider} />
              </span>
            </label>
          </>
        )}

        {notifyViaSms !== null && (
          <>
            <hr className={styles.divider} />
            <label className={clsx(styles.appearanceRow, styles.toggleRow)}>
              <div>
                <p className={styles.appearanceLabel}>{t.settingsNotifications.smsAlerts}</p>
                <p className={styles.appearanceValue}>{t.settingsNotifications.smsAlertsDesc}</p>
              </div>
              <span className={styles.switchTrack}>
                <input
                  type="checkbox"
                  name="notify_via_sms"
                  defaultChecked={notifyViaSms}
                  className={styles.switchInput}
                />
                <span className={styles.switchSlider} />
              </span>
            </label>
          </>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={pending}
          style={{ marginTop: "1.25rem" }}
        >
          {pending && <Loader2 size={16} className={styles.spin} />}
          {pending ? t.settingsNotifications.saving : t.settingsNotifications.save}
        </button>
      </form>
    </div>
  );
}

/**
 * Card with a shortcut link to the user management page. Only rendered by
 * the admin settings page when the current user has `manage_users` — the
 * permission check itself lives in the calling page, not here.
 */
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
        <Link href="/users" className={styles.shortcutLink}>
          Go to Users →
        </Link>
      </div>
    </div>
  );
}

/**
 * Card with the Help Center FAQ inlined directly (no separate /help route
 * — see HelpFaq.tsx for the actual question/answer content per role).
 */
export function HelpCenterSettings({ role }: { role: "farmer" | "driver" | "warehouse_manager" | "admin" | "partner" }) {
  const { t } = useLanguage();
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsHelpCenter.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsHelpCenter.subtitle}</p>
      <HelpFaq role={role} />
    </div>
  );
}

/**
 * Card with a shortcut to Messages plus the running app version.
 * `messagesHref` differs per portal (/messages vs /farmer/messages vs
 * /driver/messages), so the calling page passes it in rather than this
 * component guessing the route group.
 */
export function SupportSettings({
  messagesHref,
}: {
  messagesHref: string;
}) {
  const { t } = useLanguage();
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>{t.settingsSupport.title}</h2>
      <p className={styles.cardSubtitle}>{t.settingsSupport.subtitle}</p>

      <div className={styles.shortcutRow}>
        <div>
          <p className={styles.appearanceLabel}>{t.settingsSupport.contactSupport}</p>
          <p className={styles.appearanceValue}>{t.settingsSupport.contactSupportDesc}</p>
        </div>
        <Link href={messagesHref} className={styles.shortcutLink}>
          {t.settingsSupport.sendMessage}
        </Link>
      </div>

      <hr className={styles.divider} />

      <div className={styles.appearanceRow}>
        <div>
          <p className={styles.appearanceLabel}>{t.settingsSupport.version}</p>
          <p className={styles.appearanceValue}>Smart PMB v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
