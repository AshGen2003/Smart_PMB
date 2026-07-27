/**
 * `/signup/mill-owner` — public self-registration page for rice mill
 * owners, mirroring `/signup/farmer`.
 */
import AuthShell from "../../AuthShell";
import SignupMillOwnerForm, { type DistrictOption } from "./SignupMillOwnerForm";

/**
 * Server Component: fetches the public district list (needed to populate
 * the form's location dropdown) directly from the Django backend.
 */
export default async function SignupMillOwnerPage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/districts/`,
    { cache: "no-store" }
  );
  const districts = res.ok ? ((await res.json()) as DistrictOption[]) : [];

  return (
    <AuthShell>
      <SignupMillOwnerForm districts={districts} />
    </AuthShell>
  );
}
