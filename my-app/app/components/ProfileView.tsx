import { AccountSettingsForm } from "./SettingsSections";
import { ProfilePictureUploader } from "./ProfilePictureUploader";
import styles from "./ProfileView.module.css";

export type FarmerProfileDetails = {
  registration_no: string;
  land_size: string | null;
  status: string;
  district: string | null;
  province: string | null;
};

function formatPermission(codename: string) {
  return codename
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ProfileView({
  fullName,
  email,
  roleName,
  permissions,
  nic,
  phoneNumber,
  profilePictureUrl,
  farmerDetails,
}: {
  fullName: string;
  email: string;
  roleName: string;
  permissions: string[];
  nic?: string;
  phoneNumber?: string;
  profilePictureUrl?: string | null;
  farmerDetails?: FarmerProfileDetails | null;
}) {
  const avatarLetter = fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>My Profile</h1>
        <p className={styles.subtitle}>View your account details and manage your credentials.</p>
      </div>

      <div className={styles.identityCard}>
        <ProfilePictureUploader
          currentUrl={profilePictureUrl ?? null}
          fallbackLetter={avatarLetter}
        />
        <div>
          <div className={styles.name}>{fullName || "—"}</div>
          <div className={styles.email}>{email}</div>
          <span className={styles.roleBadge}>{roleName}</span>
        </div>
      </div>

      {farmerDetails ? (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>Farmer details</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Registration No.</span>
              <span className={styles.detailValue}>{farmerDetails.registration_no}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <span className={styles.detailValue}>{farmerDetails.status}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Land size</span>
              <span className={styles.detailValue}>
                {farmerDetails.land_size ? `${farmerDetails.land_size} acres` : "—"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>District</span>
              <span className={styles.detailValue}>{farmerDetails.district ?? "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Province</span>
              <span className={styles.detailValue}>{farmerDetails.province ?? "—"}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>Permissions</h2>
          {permissions.length > 0 ? (
            <div className={styles.permGrid}>
              {permissions.map((p) => (
                <span key={p} className={styles.permBadge}>
                  {formatPermission(p)}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No special permissions granted.</p>
          )}
        </div>
      )}

      <AccountSettingsForm
        fullName={fullName}
        email={email}
        nic={nic}
        phoneNumber={phoneNumber}
      />
    </div>
  );
}
