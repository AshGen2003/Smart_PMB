/**
 * `/purchaser/settings` — self-service settings page for the logged-in
 * authorized purchaser: account details and appearance (theme). No
 * admin-only shortcuts section here, since purchasers never have
 * manage_users.
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
import styles from "../PurchaserDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function PurchaserSettingsPage() {
  const user = await requirePermission("view_settings");

  return (
    <div className={styles.dashboard}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account and how Smart PMB looks for you.
        </p>
      </div>

      <AccountSettingsForm
        fullName={user.fullName ?? ""}
        email={user.email}
        nic={user.nic}
        phoneNumber={user.phoneNumber}
      />
      <AppearanceSettings />
      <LanguageSettings />
      <NotificationSettings
        notifyMessages={user.notifyMessages}
        notifyHarvestUpdates={user.notifyHarvestUpdates}
        notifyViaSms={user.notifyViaSms}
      />
      <HelpCenterSettings role="partner" />
      <SupportSettings messagesHref="/purchaser/messages" />
    </div>
  );
}
