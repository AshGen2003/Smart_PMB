/**
 * `/signup/partner` — public self-registration page for authorized
 * purchasers and mill owners. Unlike farmer signup, this doesn't grant
 * access on its own: submitting here creates a pending LicenseApplication
 * that an officer/admin must approve (see `/licenses`) before the account
 * can do anything beyond seeing a "pending approval" holding screen.
 */
import AuthShell from "../../AuthShell";
import SignupPartnerForm from "./SignupPartnerForm";

export default function SignupPartnerPage() {
  return (
    <AuthShell>
      <SignupPartnerForm />
    </AuthShell>
  );
}
