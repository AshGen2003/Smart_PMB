/**
 * Shared "My Profile" view used by both the admin profile page
 * (`(admin)/profile/page.tsx`) and the farmer profile page
 * (`farmer/profile/page.tsx`): avatar uploader, identity card, a
 * read-only personal details card, and either a farmer-specific details
 * panel or a permissions list. This is purely a "view your info" page —
 * editing (name/NIC/phone/password) lives on Settings, not here, so the
 * two pages don't duplicate the same form. Client Component (rather than
 * the Server Component it used to be) because it needs useLanguage() for
 * translations — all its data still arrives via props from the calling
 * Server Component page, so this doesn't change what it fetches.
 */
"use client";

import { ProfilePictureUploader } from "./ProfilePictureUploader";
import { useLanguage } from "./LanguageProvider";
import styles from "./ProfileView.module.css";

/** Farmer-only fields (registration number, land size, location) shown instead of a permissions list when present. */
export type FarmerProfileDetails = {
  registration_no: string;
  land_size: string | null;
  status: string;
  district: string | null;
  province: string | null;
  bank_account: string;
  bank_name: string;
};

/** Mill-owner-only fields (registration number, mill name, capacity, location) shown instead of a permissions list when present. */
export type MillProfileDetails = {
  registration_no: string;
  mill_name: string;
  capacity_mt_per_day: string | null;
  status: string;
  district_name: string | null;
  province_name: string | null;
};

/** Authorized-purchaser-only fields (organization, registration no., district) shown instead of a permissions list when present. */
export type AuthorizedPurchaserProfileDetails = {
  organization: string;
  reg_number: string;
  district_name: string | null;
  phone: string;
  authorized_date: string;
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
  millDetails,
  authorizedPurchaserDetails,
}: {
  fullName: string;
  email: string;
  roleName: string;
  permissions: string[];
  nic?: string;
  phoneNumber?: string;
  profilePictureUrl?: string | null;
  farmerDetails?: FarmerProfileDetails | null;
  millDetails?: MillProfileDetails | null;
  authorizedPurchaserDetails?: AuthorizedPurchaserProfileDetails | null;
}) {
  const { t } = useLanguage();
  const avatarLetter = fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{t.profileView.title}</h1>
        <p className={styles.subtitle}>{t.profileView.subtitle}</p>
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
        <h2 className={styles.detailsTitle}>{t.profileView.personalDetailsTitle}</h2>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>{t.profileView.fullName}</span>
            <span className={styles.detailValue}>{fullName || "—"}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>{t.profileView.nic}</span>
            <span className={styles.detailValue}>{nic || "—"}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>{t.profileView.phoneNumber}</span>
            <span className={styles.detailValue}>{phoneNumber || "—"}</span>
          </div>
          <div className={`${styles.detailItem} ${styles.detailItemWide}`}>
            <span className={styles.detailLabel}>{t.profileView.email}</span>
            <span className={styles.detailValue}>{email}</span>
          </div>
        </div>
      </div>

      {farmerDetails ? (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>{t.profileView.farmerDetailsTitle}</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.registrationNo}</span>
              <span className={styles.detailValue}>{farmerDetails.registration_no}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.status}</span>
              <span className={styles.detailValue}>{farmerDetails.status}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.landSize}</span>
              <span className={styles.detailValue}>
                {farmerDetails.land_size ? `${farmerDetails.land_size} ${t.profileView.acres}` : "—"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.district}</span>
              <span className={styles.detailValue}>{farmerDetails.district ?? "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.province}</span>
              <span className={styles.detailValue}>{farmerDetails.province ?? "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.bank}</span>
              <span className={styles.detailValue}>{farmerDetails.bank_name || "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.bankAccount}</span>
              <span className={styles.detailValue}>{farmerDetails.bank_account || "—"}</span>
            </div>
          </div>
        </div>
      ) : millDetails ? (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>{t.profileView.millDetailsTitle}</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.registrationNo}</span>
              <span className={styles.detailValue}>{millDetails.registration_no}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.millName}</span>
              <span className={styles.detailValue}>{millDetails.mill_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.status}</span>
              <span className={styles.detailValue}>{millDetails.status}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.capacity}</span>
              <span className={styles.detailValue}>
                {millDetails.capacity_mt_per_day ? `${millDetails.capacity_mt_per_day} MT/day` : "—"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.district}</span>
              <span className={styles.detailValue}>{millDetails.district_name ?? "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.province}</span>
              <span className={styles.detailValue}>{millDetails.province_name ?? "—"}</span>
            </div>
          </div>
        </div>
      ) : authorizedPurchaserDetails ? (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>{t.profileView.purchaserDetailsTitle}</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.organization}</span>
              <span className={styles.detailValue}>{authorizedPurchaserDetails.organization}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.registrationNo}</span>
              <span className={styles.detailValue}>{authorizedPurchaserDetails.reg_number || "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.district}</span>
              <span className={styles.detailValue}>{authorizedPurchaserDetails.district_name ?? "—"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t.profileView.phone}</span>
              <span className={styles.detailValue}>{authorizedPurchaserDetails.phone || "—"}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>{t.profileView.permissionsTitle}</h2>
          {permissions.length > 0 ? (
            <div className={styles.permGrid}>
              {permissions.map((p) => (
                <span key={p} className={styles.permBadge}>
                  {formatPermission(p)}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>{t.profileView.permissionsEmpty}</p>
          )}
        </div>
      )}
    </div>
  );
}
