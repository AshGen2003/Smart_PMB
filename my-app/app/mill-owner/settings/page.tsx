/**
 * `/mill-owner/settings` — self-service settings page for the logged-in
 * mill owner: account details, mill business details, and appearance
 * (theme). Mirrors app/farmer/settings/page.tsx, plus a mill-details
 * editing section (mill owners have business fields to maintain that
 * farmers don't).
 */
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import {
  AccountSettingsForm,
  AppearanceSettings,
} from "@/app/components/SettingsSections";
import MillDetailsForm, { type DistrictOption, type MillDetails } from "./MillDetailsForm";
import styles from "../MillOwnerDashboard.module.css";

export default async function MillOwnerSettingsPage() {
  const user = await requireUser();

  const [meRes, millRes, districtsRes] = await Promise.all([
    apiFetch("/api/auth/me/"),
    apiFetch("/api/mill-owner/profile/"),
    apiFetch("/api/districts/"),
  ]);
  const me = meRes.ok ? await meRes.json() : null;
  const mill: MillDetails | null = millRes.ok ? await millRes.json() : null;
  const districts: DistrictOption[] = districtsRes.ok ? await districtsRes.json() : [];

  return (
    <div className={styles.dashboard}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your account, mill details, and how Smart PMB looks for you.
        </p>
      </div>

      <AccountSettingsForm
        fullName={user.fullName ?? ""}
        email={user.email}
        nic={me?.nic ?? ""}
        phoneNumber={me?.phone_number ?? ""}
      />
      {mill && <MillDetailsForm mill={mill} districts={districts} />}
      <AppearanceSettings />
    </div>
  );
}
