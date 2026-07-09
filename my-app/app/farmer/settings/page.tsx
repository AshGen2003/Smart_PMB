import { requireUser } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AppearanceSettings,
} from "@/app/components/SettingsSections";
import styles from "../FarmerDashboard.module.css";

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
