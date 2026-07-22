/**
 * Shared two-panel layout wrapping every public auth page (login, signup,
 * confirm-email): a branded marketing panel on one side and the actual
 * form (`children`) on the other. Used by pages under `(auth)/`, which is
 * a route group and so contributes nothing to the URL path.
 */
import Image from "next/image";
import { Sprout, Coins, Truck } from "lucide-react";
import styles from "./AuthLayout.module.css";
import AuthThemeToggle from "./AuthThemeToggle";

const FEATURES = [
  { icon: Sprout, label: "Log every harvest in seconds" },
  { icon: Coins, label: "See guaranteed prices before you sell" },
  { icon: Truck, label: "Track collection and delivery status" },
];

/** Renders the branded marketing panel plus a form panel (with theme toggle) that hosts `children`. */
export default function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className={styles.brandLogo}
          />
          <span className={styles.brandName}>Smart PMB</span>
        </div>

        <div className={styles.brandMiddle}>
          <div className={styles.heroLogoWrap}>
            <div className={styles.heroLogoGlow} />
            <Image
              src="/logo.png"
              alt="Smart PMB"
              width={168}
              height={168}
              className={styles.heroLogo}
              priority
            />
          </div>

          <p className={styles.brandTagline}>
            Track your harvest. Know your price. Get paid on time.
          </p>
          <p className={styles.brandSubtext}>
            The digital home for Sri Lanka&apos;s paddy purchasing network.
          </p>

          <div className={styles.featureList}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <div className={styles.featureItem} key={label}>
                <span className={styles.featureIcon}>
                  <Icon size={16} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.brandFooter}>
          &copy; {new Date().getFullYear()} Smart PMB
        </div>
      </div>

      <div className={styles.formPanel}>
        <AuthThemeToggle />
        {children}
      </div>
    </div>
  );
}
