import { requireRole } from "@/app/lib/dal";
import FarmerShell from "@/app/components/FarmerShell";

export default async function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("farmer");

  return (
    <FarmerShell userName={user.fullName ?? user.email}>{children}</FarmerShell>
  );
}
