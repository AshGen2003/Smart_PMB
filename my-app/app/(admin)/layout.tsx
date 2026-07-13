import { redirect } from "next/navigation";
import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
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

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <AdminShell
      userName={user.fullName ?? user.email}
      roleLabel={user.roleName}
      permissions={user.permissions}
      profilePictureUrl={me?.profile_picture ?? null}
    >
      {children}
    </AdminShell>
  );
}
