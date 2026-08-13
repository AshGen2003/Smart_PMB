/**
 * `/signup/authorized-purchaser` — public self-registration page for
 * authorized purchasers, mirroring `/signup/transport-operator`.
 */
import AuthShell from "../../AuthShell";
import SignupAuthorizedPurchaserForm from "./SignupAuthorizedPurchaserForm";

export default function SignupAuthorizedPurchaserPage() {
  return (
    <AuthShell>
      <SignupAuthorizedPurchaserForm />
    </AuthShell>
  );
}
