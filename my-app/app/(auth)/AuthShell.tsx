/**
 * Shared two-panel layout wrapping every public auth page (login, signup,
 * confirm-email, forgot-password): a branded marketing panel on one side
 * and the actual form (`children`) on the other. Used by pages under
 * `(auth)/`, which is a route group and so contributes nothing to the URL
 * path.
 */
"use client";

import Image from "next/image";
import { Sprout, Coins, Truck } from "lucide-react";
import styles from "./AuthLayout.module.css";
import AuthThemeToggle from "./AuthThemeToggle";
import AuthLanguageToggle from "./AuthLanguageToggle";
import { useLanguage } from "@/app/components/LanguageProvider";

const FEATURE_ICONS = [Sprout, Coins, Truck];

/** Renders the branded marketing panel plus a form panel (with theme/language toggles) that hosts `children`. */
export default function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

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

          <p className={styles.brandTagline}>{t.authShell.tagline}</p>
          <p className={styles.brandSubtext}>{t.authShell.subtext}</p>

          <div className={styles.featureList}>
            {t.authShell.features.map((label, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div className={styles.featureItem} key={label}>
                  <span className={styles.featureIcon}>
                    <Icon size={16} />
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.brandFooter}>
          &copy; {new Date().getFullYear()} Smart PMB
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.toggleGroup}>
          <AuthLanguageToggle />
          <AuthThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
