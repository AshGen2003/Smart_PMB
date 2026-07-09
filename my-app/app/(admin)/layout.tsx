import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { ROLE_LABELS } from "@/app/lib/roles";
import AdminShell from "@/app/components/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (user.role === "farmer") {
    redirect("/farmer");
  }

  return (
    <AdminShell
      userName={user.fullName ?? user.email}
      roleLabel={ROLE_LABELS[user.role] ?? user.role}
    >
      {children}
    </AdminShell>
  );
}
