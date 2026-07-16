import { requireRole } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import FarmerShell from "@/app/components/FarmerShell";

export default async function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("farmer");

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <FarmerShell
      userName={user.fullName ?? user.email}
      profilePictureUrl={me?.profile_picture ?? null}
    >
      {children}
    </FarmerShell>
  );
}
