import { requireUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { ProfileView } from "@/app/components/ProfileView";

export default async function AdminProfilePage() {
  const user = await requireUser();

  const meRes = await apiFetch("/api/auth/me/");
  const me = meRes.ok ? await meRes.json() : null;

  return (
    <ProfileView
      fullName={user.fullName ?? ""}
      email={user.email}
      roleName={user.roleName}
      permissions={user.permissions}
      nic={me?.nic ?? ""}
      phoneNumber={me?.phone_number ?? ""}
      profilePictureUrl={me?.profile_picture ?? null}
    />
  );
}
