/**
 * `/signup/transport-operator` — public self-registration page for
 * transport operators, mirroring `/signup/mill-owner` minus the district
 * fetch (no domain profile / location needed).
 */
import AuthShell from "../../AuthShell";
import SignupTransportOperatorForm from "./SignupTransportOperatorForm";

export default function SignupTransportOperatorPage() {
  return (
    <AuthShell>
      <SignupTransportOperatorForm />
    </AuthShell>
  );
}
