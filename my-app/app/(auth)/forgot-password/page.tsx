/**
 * `/forgot-password` — public self-service password-reset request page.
 * Mirrors the other `(auth)/` pages: AuthShell wrapper, form does the rest.
 */
import AuthShell from "../AuthShell";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
