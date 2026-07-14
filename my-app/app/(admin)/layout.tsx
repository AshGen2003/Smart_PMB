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

  const [meRes, configRes] = await Promise.all([
    apiFetch("/api/auth/me/"),
    apiFetch("/api/admin/system-config/"),
  ]);
  const me = meRes.ok ? await meRes.json() : null;
  const config = configRes.ok ? await configRes.json() : null;

  return (
    <AdminShell
      userName={user.fullName ?? user.email}
      roleLabel={user.roleName}
      permissions={user.permissions}
      profilePictureUrl={me?.profile_picture ?? null}
      idleMinutes={config?.idle_logout_minutes}
      maintenanceMode={config?.maintenance_mode ?? false}
    >
      {children}
    </AdminShell>
  );
}
