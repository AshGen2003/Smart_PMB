/**
 * `/mill-owner/settings` — self-service settings page for the logged-in
 * mill owner: account details, mill business details, and appearance
 * (theme). No admin-only shortcuts section here, since mill owners never
 * have manage_users.
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
import MillDetailsForm, { type DistrictOption, type MillDetails } from "./MillDetailsForm";
import styles from "../MillOwnerDashboard.module.css";

/** Server Component: loads the current user and renders the shared settings sections. */
export default async function MillOwnerSettingsPage() {
  const user = await requirePermission("view_settings");

  const [millRes, districtsRes] = await Promise.all([
    !user.previewing ? apiFetch("/api/mill-owner/profile/") : Promise.resolve(null),
    !user.previewing ? apiFetch("/api/districts/") : Promise.resolve(null),
  ]);
  const mill: MillDetails | null = millRes?.ok ? await millRes.json() : null;
  const districts: DistrictOption[] = districtsRes?.ok ? await districtsRes.json() : [];

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
      {mill && <MillDetailsForm mill={mill} districts={districts} />}
      <AppearanceSettings />
      <LanguageSettings />
      <NotificationSettings
        notifyMessages={user.notifyMessages}
        notifyHarvestUpdates={user.notifyHarvestUpdates}
        notifyViaSms={user.notifyViaSms}
      />
      <HelpCenterSettings role="partner" />
      <SupportSettings messagesHref="/mill-owner/messages" />
    </div>
  );
}
