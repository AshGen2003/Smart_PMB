"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyAccessToken } from "@/app/lib/jwt";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setTokenCookies,
} from "@/app/lib/session";
import { firstErrorMessage } from "@/app/lib/errors";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

export type FormState = {
  error?: string;
};

export async function login(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both email and password." };
  }

  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data, "Invalid email or password.") };
  }

  const { access, refresh } = await res.json();
  const payload = await verifyAccessToken(access);

  await setTokenCookies(access, refresh);
  revalidatePath("/", "layout");
  redirect(payload?.role === "farmer" ? "/farmer" : "/dashboard");
}

export type SignupState = {
  error?: string;
};

export async function signupFarmer(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const districtId = Number(formData.get("districtId"));

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!districtId) {
    return { error: "Please select your district." };
  }

  const landSizeRaw = formData.get("landSize");

  const payload = {
    email: String(formData.get("email") ?? "").trim(),
    password,
    name: String(formData.get("name") ?? "").trim(),
    nic: String(formData.get("nic") ?? "").trim(),
    contact_number: String(formData.get("contactNumber") ?? "").trim(),
    district_id: districtId,
    land_size: landSizeRaw ? Number(landSizeRaw) : null,
    bank_name: String(formData.get("bankName") ?? "").trim(),
    bank_account: String(formData.get("bankAccount") ?? "").trim(),
  };

  const res = await fetch(`${API_URL}/api/auth/register/farmer/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  redirect("/login?registered=1");
}

export async function logout() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  const access = cookieStore.get(ACCESS_COOKIE)?.value;

  if (refresh) {
    await fetch(`${API_URL}/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    }).catch(() => {});
  }

  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
