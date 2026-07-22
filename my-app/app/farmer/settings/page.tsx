/**
 * `/farmer/settings` — self-service settings page for the logged-in
 * farmer: account details and appearance (theme). No admin-only shortcuts
 * section here (unlike the admin settings page), since farmers never have
 * manage_users.
 */
import { requireUser } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AppearanceSettings,
} from "@/app/components/SettingsSections";
import styles from "../FarmerDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function FarmerSettingsPage() {
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
