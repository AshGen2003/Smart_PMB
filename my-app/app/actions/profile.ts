"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";
import { setTokenCookies } from "@/app/lib/session";

export type ProfileState = {
  error?: string;
  success?: string;
};

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

  const { access, refresh } = await res.json();
  await setTokenCookies(access, refresh);

  revalidatePath("/settings");
  revalidatePath("/farmer/settings");
  revalidatePath("/profile");
  revalidatePath("/farmer/profile");
  return { success: "Your changes have been saved." };
}

export type ProfilePictureState = {
  error?: string;
};

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

  revalidatePath("/settings");
  revalidatePath("/farmer/settings");
  revalidatePath("/profile");
  revalidatePath("/farmer/profile");
  revalidatePath("/dashboard");
  revalidatePath("/farmer");
  return {};
}
