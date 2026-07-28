/**
 * `/driver/settings` — self-service settings page for the logged-in
 * driver: account details and appearance (theme).
 */
import { requirePermission } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AppearanceSettings,
  NotificationSettings,
  HelpCenterSettings,
  SupportSettings,
} from "@/app/components/SettingsSections";
import styles from "../DriverDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function DriverSettingsPage() {
  const user = await requirePermission("view_settings");

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
      <NotificationSettings
        notifyMessages={user.notifyMessages}
        notifyHarvestUpdates={user.notifyHarvestUpdates}
      />
      <HelpCenterSettings role="driver" />
      <SupportSettings messagesHref="/driver/messages" />
    </div>
  );
}
