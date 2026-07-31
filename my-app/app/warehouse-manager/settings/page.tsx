/**
 * `/warehouse-manager/settings` — self-service settings page for the
 * logged-in warehouse manager: account details and appearance (theme).
 */
import { requireUser } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AppearanceSettings,
} from "@/app/components/SettingsSections";
import styles from "../WarehouseManagerDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function WarehouseManagerSettingsPage() {
  const user = await requireUser();

  return (
    <div className={styles.dashboard}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account and how Smart PMB looks for you.
        </p>
      </div>

      <AccountSettingsForm fullName={user.fullName ?? ""} email={user.email} />
      <AppearanceSettings />
    </div>
  );
}
