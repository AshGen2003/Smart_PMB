/**
 * `/settings` — self-service settings page for the logged-in admin/officer:
 * account details, appearance (theme), and an admin-only shortcuts panel.
 * Available to any authenticated non-farmer user.
 */
import { requireUser } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AdminShortcutSettings,
  AppearanceSettings,
} from "@/app/components/SettingsSections";
import styles from "../residents/Users.module.css";

/** Server Component: loads the current user and conditionally renders the manage_users-only shortcuts panel. */
export default async function SettingsPage() {
  const user = await requireUser();

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
      {/* Shortcuts to admin-only areas (users, roles) — only shown to users who can manage_users. */}
      {user.permissions.includes("manage_users") && <AdminShortcutSettings />}
    </div>
  );
}
