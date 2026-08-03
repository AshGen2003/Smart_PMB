/**
 * `/officer/settings` — the officer-portal counterpart to `/settings`.
 * Requires `view_settings`. Mirrors (admin)/settings/page.tsx, minus the
 * manage_users-only AdminShortcutSettings panel (a pmb_officer role never
 * holds manage_users) and pointing SupportSettings at this portal's own
 * messages page instead of the admin shell's.
 */
import { requirePermission } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AppearanceSettings,
  LanguageSettings,
  NotificationSettings,
  HelpCenterSettings,
  SupportSettings,
} from "@/app/components/SettingsSections";
import styles from "@/app/(admin)/residents/Users.module.css";

export default async function OfficerSettingsPage() {
  const user = await requirePermission("view_settings");

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account, preferences, and system access.
        </p>
      </div>

      <AccountSettingsForm fullName={user.fullName ?? ""} email={user.email} />
      <AppearanceSettings />
      <LanguageSettings />
      <NotificationSettings
        notifyMessages={user.notifyMessages}
        notifyHarvestUpdates={user.notifyHarvestUpdates}
        notifyViaSms={user.notifyViaSms}
      />
      <HelpCenterSettings role="admin" />
      <SupportSettings messagesHref="/officer/messages" />
    </div>
  );
}
