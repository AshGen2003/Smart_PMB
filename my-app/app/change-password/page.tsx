/**
 * `/change-password` — forced password-change page for any account whose
 * must_change_password flag is set (admin-created or admin-reset — see
 * accounts/views.py's AdminUserWriteSerializer). Every portal layout
 * (admin/farmer/driver/partner) redirects here before rendering its real
 * shell while the flag is set; this page redirects right back to the
 * user's own home once it's no longer set (e.g. a direct visit after
 * already having changed it).
 */
import { redirect } from "next/navigation";
import { requireUser, homeFor } from "@/app/lib/dal";
import AuthShell from "../(auth)/AuthShell";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  if (!user.mustChangePassword) {
    redirect(homeFor(user));
  }

  return (
    <AuthShell>
      <ChangePasswordForm fullName={user.fullName ?? ""} homeHref={homeFor(user)} />
    </AuthShell>
  );
}
