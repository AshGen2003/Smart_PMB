/**
 * `/signup/farmer` — public self-registration page for farmers. Admin,
 * officer, and other staff accounts are created by an admin via
 * `/residents`, not through public signup.
 */
import AuthShell from "../../AuthShell";
import SignupFarmerForm, { type DistrictOption } from "./SignupFarmerForm";

/**
 * Server Component: fetches the public district list (needed to populate
 * the form's location dropdown) directly from the Django backend — this
 * endpoint requires no auth, so it skips the apiFetch() cookie-forwarding
 * helper and hits the API URL directly.
 */
export default async function SignupFarmerPage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/districts/`,
    { cache: "no-store" }
  );
  const districts = res.ok ? ((await res.json()) as DistrictOption[]) : [];

  return (
    <AuthShell>
      <SignupFarmerForm districts={districts} />
    </AuthShell>
  );
}
