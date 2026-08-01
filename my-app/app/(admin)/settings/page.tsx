/**
 * `/settings` — self-service settings page for the logged-in admin/officer:
 * account details, appearance (theme), and an admin-only shortcuts panel.
 * Requires `view_settings` — granted to every role by default (see the
 * accounts/0015 migration), toggleable per role from /roles or the Preview
 * Portal's quick-toggle checklist.
 */
import { requirePermission } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AdminShortcutSettings,
  AppearanceSettings,
  LanguageSettings,
  NotificationSettings,
  HelpCenterSettings,
  SupportSettings,
} from "@/app/components/SettingsSections";
import styles from "../residents/Users.module.css";

/** Server Component: loads the current user and conditionally renders the manage_users-only shortcuts panel. */
export default async function SettingsPage() {
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
      />
      <HelpCenterSettings role="admin" />
      <SupportSettings messagesHref="/messages" />
      {/* Shortcuts to admin-only areas (users, roles) — only shown to users who can manage_users. */}
      {user.permissions.includes("manage_users") && <AdminShortcutSettings />}
    </div>
  );
}
