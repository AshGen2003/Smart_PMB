/**
 * Server Actions for a logged-in user's own account settings — updating
 * profile details/password and uploading a profile picture. Distinct from
 * actions/users.ts, which is the admin-side management of OTHER users'
 * accounts; these actions only ever touch the caller's own record ("/me/"
 * on the Django API, resolved from the request's access token).
 */
"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";
import { setTokenCookies } from "@/app/lib/session";

// Every portal that has its own profile/settings pages and dashboard shell
// showing the avatar (admin/officer share the bare (admin) route group).
// A profile-picture or name change is visible on all three per role, so
// every action below that touches those fields needs to revalidate all of
// them, not just the one the user happened to submit from.
const PORTAL_ROOTS = [
  "", // (admin)/officer — bare root
  "/farmer",
  "/driver",
  "/warehouse-manager",
  "/mill-owner",
  "/purchaser",
];

function revalidateProfilePaths() {
  for (const root of PORTAL_ROOTS) {
    revalidatePath(root || "/dashboard");
    revalidatePath(`${root}/profile`);
    revalidatePath(`${root}/settings`);
  }
  // Officer portal is a distinct route tree from (admin) despite sharing
  // the same bare-root pattern conceptually.
  revalidatePath("/officer");
  revalidatePath("/officer/profile");
  revalidatePath("/officer/settings");
}

// success is included alongside error because, unlike most action results,
// the caller doesn't navigate away or reset the form on success (the user
// often stays on the settings page), so the UI needs an explicit success
// message to show it worked.
export type ProfileState = {
  error?: string;
  success?: string;
};

/**
 * Updates the current user's profile fields, and optionally their
 * password. Applies to both farmers and admin/officer users — the same
 * Django endpoint and action back both role's "settings"/"profile" pages
 * (see the four `revalidatePath` calls below covering each variant).
 *
 * Validates password rules client-side-equivalent (length, confirmation
 * match, current password required) before calling the API, so a bad
 * password submission never even reaches Django.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Profile fields: fullName, nic, phoneNumber, and
 *   optionally currentPassword/newPassword/confirmPassword.
 * @returns `{ error }` on validation/API failure, or `{ success }` with a
 *   confirmation message once the update is saved.
 */
export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const nic = String(formData.get("nic") ?? "").trim();
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!fullName) {
    return { error: "Full name can't be empty." };
  }
  if (newPassword && newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword && newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }
  if (newPassword && !currentPassword) {
    return { error: "Enter your current password to set a new one." };
  }

  const payload: Record<string, string> = {
    full_name: fullName,
    nic,
    phone_number: phoneNumber,
  };
  if (newPassword) {
    payload.current_password = currentPassword;
    payload.new_password = newPassword;
  }

  const res = await apiFetch("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not update your profile.") };
  }

  // The profile endpoint returns a freshly issued token pair because the
  // JWT embeds profile data (name) and, when a password changes, Django
  // typically rotates the token as well — reusing the old cookie would show
  // stale info or an invalidated session, so we overwrite both cookies with
  // the new tokens.
  const { access, refresh } = await res.json();
  await setTokenCookies(access, refresh);

  revalidateProfilePaths();
  return { success: "Your changes have been saved." };
}

export type ProfilePictureState = {
  error?: string;
};

/**
 * Uploads a new profile picture for the current user.
 *
 * Sends the file as `multipart/form-data` (a fresh FormData containing
 * just the file) rather than JSON — apiFetch() detects the FormData body
 * and skips setting a JSON Content-Type so the multipart boundary is
 * preserved correctly.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Must contain a `profile_picture` File field.
 * @returns `{ error }` if no file was selected or the upload failed,
 *   otherwise `{}` after revalidating every page that displays the user's
 *   avatar across every portal.
 */
export async function uploadProfilePicture(
  _prevState: ProfilePictureState,
  formData: FormData
): Promise<ProfilePictureState> {
  const file = formData.get("profile_picture");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Select an image to upload." };
  }

  const body = new FormData();
  body.set("profile_picture", file);

  const res = await apiFetch("/api/auth/me/", {
    method: "PATCH",
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not upload your photo.") };
  }

  revalidateProfilePaths();
  return {};
}

/**
 * Removes the current user's profile picture. Distinct from a plain PATCH
 * with no `profile_picture` field (which means "leave it unchanged") via
 * the explicit `remove_profile_picture` flag — see SelfProfileSerializer.
 *
 * @returns `{ error }` if the API call failed, otherwise `{}` after
 *   revalidating every page that displays the user's avatar.
 */
export async function removeProfilePicture(
  _prevState: ProfilePictureState,
  _formData: FormData
): Promise<ProfilePictureState> {
  const res = await apiFetch("/api/auth/me/", {
    method: "PATCH",
    body: JSON.stringify({ remove_profile_picture: true }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Could not remove your photo.") };
  }

  revalidateProfilePaths();
  return {};
}
