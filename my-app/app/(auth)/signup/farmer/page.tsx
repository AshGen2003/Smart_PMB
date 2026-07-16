import AuthShell from "../../AuthShell";
import SignupFarmerForm, { type DistrictOption } from "./SignupFarmerForm";

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
