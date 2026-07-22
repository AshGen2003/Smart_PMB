/**
 * Shared "My Profile" view used by both the admin profile page
 * (`(admin)/profile/page.tsx`) and the farmer profile page
 * (`farmer/profile/page.tsx`): avatar uploader, identity card, a
 * read-only personal details card, and either a farmer-specific details
 * panel or a permissions list. This is purely a "view your info" page —
 * editing (name/NIC/phone/password) lives on Settings, not here, so the
 * two pages don't duplicate the same form.
 */
import { ProfilePictureUploader } from "./ProfilePictureUploader";
import styles from "./ProfileView.module.css";

/** Farmer-only fields (registration number, land size, location) shown instead of a permissions list when present. */
export type FarmerProfileDetails = {
  registration_no: string;
  land_size: string | null;
  status: string;
  district: string | null;
  province: string | null;
};

/** Converts a permission codename like "manage_users" into a display label like "Manage Users". */
function formatPermission(codename: string) {
  return codename
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Renders the profile page. When `farmerDetails` is provided (farmer
 * users), shows a farmer-details card instead of the permissions list that
 * admin/officer users see — the two are mutually exclusive since only
 * farmers have farmerDetails and only admin/officer roles carry meaningful
 * permissions.
 */
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
        <p className={styles.subtitle}>
          View your personal details. To edit your name, contact info, or password, go to Settings.
        </p>
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

      <div className={styles.detailsCard}>
        <h2 className={styles.detailsTitle}>Personal details</h2>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Full name</span>
            <span className={styles.detailValue}>{fullName || "—"}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailValue}>{email}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>NIC</span>
            <span className={styles.detailValue}>{nic || "—"}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Phone number</span>
            <span className={styles.detailValue}>{phoneNumber || "—"}</span>
          </div>
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
    </div>
  );
}
