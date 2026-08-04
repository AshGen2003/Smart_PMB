/**
 * `/warehouse-manager/settings` — self-service settings page for the
 * logged-in warehouse manager: account details and appearance (theme).
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
import styles from "../WarehouseManagerDashboard.module.css";

export default async function WarehouseManagerSettingsPage() {
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
      <LanguageSettings />
      <NotificationSettings
        notifyMessages={user.notifyMessages}
        notifyHarvestUpdates={user.notifyHarvestUpdates}
        notifyViaSms={user.notifyViaSms}
      />
      <HelpCenterSettings role="warehouse_manager" />
      <SupportSettings messagesHref="/warehouse-manager/messages" />
    </div>
  );
}
