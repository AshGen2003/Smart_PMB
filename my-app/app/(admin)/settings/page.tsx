import { requireUser } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AdminShortcutSettings,
  AppearanceSettings,
} from "@/app/components/SettingsSections";
import styles from "../residents/Users.module.css";

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
      {user.permissions.includes("manage_users") && <AdminShortcutSettings />}
    </div>
  );
}
