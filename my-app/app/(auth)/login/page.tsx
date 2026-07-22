/**
 * `/login` — public login page for all user types (admin, officer,
 * farmer). Just wires the shared AuthShell layout around the LoginForm;
 * LoginForm itself handles the actual authentication logic.
 */
import AuthShell from "../AuthShell";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
