/**
 * `/signup/partner` — public self-registration page for authorized
 * purchasers and mill owners. Unlike farmer signup, this doesn't grant
 * access on its own: submitting here creates a pending LicenseApplication
 * that an officer/admin must approve (see `/licenses`) before the account
 * can do anything beyond seeing a "pending approval" holding screen. Mill
 * owner applicants additionally pick a district (needed to create their
 * Mill profile alongside the account — see accounts/serializers.py's
 * RegisterLicenseApplicantSerializer), so this fetches the same public
 * district list as farmer signup.
 */
import AuthShell from "../../AuthShell";
import SignupPartnerForm, { type DistrictOption } from "./SignupPartnerForm";

export default async function SignupPartnerPage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/districts/`,
    { next: { revalidate: 3600 } }
  );
  const districts = res.ok ? ((await res.json()) as DistrictOption[]) : [];

  return (
    <AuthShell>
      <SignupPartnerForm districts={districts} />
    </AuthShell>
  );
}
