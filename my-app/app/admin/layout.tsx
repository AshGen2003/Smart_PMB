import styles from "./AdminAuth.module.css";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.shell}>{children}</div>;
}
