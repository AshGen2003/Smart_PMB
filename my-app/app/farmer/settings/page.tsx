/**
 * `/farmer/settings` — self-service settings page for the logged-in
 * farmer: account details and appearance (theme). No admin-only shortcuts
 * section here (unlike the admin settings page), since farmers never have
 * manage_users.
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import {
  AccountSettingsForm,
  AppearanceSettings,
  LanguageSettings,
  NotificationSettings,
  HelpCenterSettings,
  SupportSettings,
} from "@/app/components/SettingsSections";
import FarmerBankDetailsForm from "./FarmerBankDetailsForm";
import styles from "../FarmerDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function FarmerSettingsPage() {
  const user = await requirePermission("view_settings");

  const bankRes = await apiFetch("/api/farmer/bank-details/");
  const bank: { bank_account: string; bank_name: string } = bankRes.ok
    ? await bankRes.json()
    : { bank_account: "", bank_name: "" };

  return (
    <div className={styles.dashboard}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account and how Smart PMB looks for you.
        </p>
      </div>

      <AccountSettingsForm fullName={user.fullName ?? ""} email={user.email} nic={user.nic} phoneNumber={user.phoneNumber} />
      <FarmerBankDetailsForm bankAccount={bank.bank_account} bankName={bank.bank_name} />
      <AppearanceSettings />
      <LanguageSettings />
      <NotificationSettings
        notifyMessages={user.notifyMessages}
        notifyHarvestUpdates={user.notifyHarvestUpdates}
        notifyViaSms={user.notifyViaSms}
      />
      <HelpCenterSettings role="farmer" />
      <SupportSettings messagesHref="/farmer/messages" />
    </div>
  );
}
