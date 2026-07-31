/**
 * `/signup/warehouse-manager` — public self-registration page for
 * warehouse managers, mirroring `/signup/transport-operator` (no domain
 * profile / district fetch needed).
 */
import AuthShell from "../../AuthShell";
import SignupWarehouseManagerForm from "./SignupWarehouseManagerForm";

export default function SignupWarehouseManagerPage() {
  return (
    <AuthShell>
      <SignupWarehouseManagerForm />
    </AuthShell>
  );
}
