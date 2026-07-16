import Link from "next/link";
import clsx from "clsx";
import AuthShell from "../AuthShell";
import styles from "../AuthForm.module.css";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let success = false;
  let message = "Missing confirmation token.";

  if (token) {
    const res = await fetch(`${API_URL}/api/auth/confirm-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    success = res.ok;
    message =
      data.detail ??
      (success
        ? "Email confirmed."
        : "This confirmation link is invalid or has expired.");
  }

  return (
    <AuthShell>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {success ? "Email confirmed" : "Confirmation failed"}
        </h1>

        <div
          className={clsx(
            styles.banner,
            success ? styles.bannerSuccess : styles.bannerError
          )}
        >
          {message}
        </div>

        <p className={styles.switchLine}>
          <Link href="/login">Go to login</Link>
        </p>
      </div>
    </AuthShell>
  );
}
