import Image from "next/image";
import styles from "./AuthLayout.module.css";
import AuthThemeToggle from "./AuthThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <Image
            src="/smart-pmb-logo.svg"
            alt=""
            width={40}
            height={40}
            className={styles.brandLogo}
          />
          <span className={styles.brandName}>Smart PMB</span>
        </div>

        <div className={styles.brandMiddle}>
          <p className={styles.brandTagline}>
            From paddy field to fair price, all in one place.
          </p>
          <p className={styles.brandSubtext}>
            Track your harvests, follow guaranteed prices, and get paid on
            time — built for Sri Lanka&apos;s farmers.
          </p>
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
