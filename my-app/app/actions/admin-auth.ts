"use server";

import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/app/lib/jwt";
import { setTokenCookies } from "@/app/lib/session";
import { firstErrorMessage } from "@/app/lib/errors";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

export type AdminLoginState = {
  error?: string;
};

export async function adminLogin(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
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

  if (payload?.role !== "admin") {
    return { error: "This portal is for admin accounts only." };
  }

  await setTokenCookies(access, refresh);
  redirect("/");
}
