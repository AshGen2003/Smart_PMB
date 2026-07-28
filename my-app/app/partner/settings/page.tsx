/**
 * `/partner/settings` — self-service settings page for the logged-in
 * authorized purchaser / mill owner: account details and appearance
 * (theme). No admin-only shortcuts section here, since partners never
 * have manage_users.
 */
import { requirePermission } from "@/app/lib/dal";
import {
  AccountSettingsForm,
  AppearanceSettings,
  NotificationSettings,
  HelpCenterSettings,
  SupportSettings,
} from "@/app/components/SettingsSections";
import styles from "../PartnerDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function PartnerSettingsPage() {
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
      <HelpCenterSettings role="partner" />
      <SupportSettings messagesHref="/partner/messages" />
    </div>
  );
}
