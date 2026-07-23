/**
 * Server Actions for authentication: login, farmer self-registration, and
 * logout. These are the only places in the app that talk to Django's
 * public `/api/auth/*` endpoints directly with `fetch` (rather than going
 * through lib/api.ts's `apiFetch`), because at login/signup time there is
 * no access token yet to attach.
 *
 * Being Server Actions ("use server" below), these run only on the server
 * and are invoked by client `<form action={...}>`s or event handlers, which
 * is what lets them safely set httpOnly cookies.
 */
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

// FormState is the shape every auth Server Action returns to its calling
// <form>. An empty object means "success" (the action redirects instead of
// returning success data); `{ error }` means validation/auth failed and the
// message should be shown to the user.
export type FormState = {
  error?: string;
};

/**
 * Logs a user in: validates the submitted credentials look non-empty,
 * exchanges them with Django's JWT login endpoint, stores the returned
 * tokens in httpOnly cookies, and redirects the user to the right area of
 * the app based on their role.
 *
 * Designed to be used as the action for `useActionState`/`useFormState`,
 * hence the `(_prevState, formData)` signature — `_prevState` (the
 * previous FormState) is unused here but required by that hook's contract.
 *
 * @param _prevState Previous form state (unused; required by the
 *   useActionState calling convention).
 * @param formData Submitted form fields; expects `email` and `password`.
 * @returns `{ error }` if validation or login fails. On success this
 *   function never actually returns — `redirect()` throws to hand control
 *   to Next.js's router.
 */
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
  // Decode the fresh token locally just to read the `role` claim for the
  // redirect decision below — avoids a second round trip to Django to ask
  // "who did I just log in as."
  const payload = await verifyAccessToken(access);

  await setTokenCookies(access, refresh);
  // Bust the root layout's cached render so the header/nav (which shows
  // login state) reflects the newly authenticated user on next navigation.
  revalidatePath("/", "layout");
  // Farmers and drivers land on their own portal; every other role
  // (admin, PMB officers, etc.) lands on the shared admin dashboard.
  const home =
    payload?.role === "farmer" ? "/farmer" : payload?.role === "driver" ? "/driver" : "/dashboard";
  redirect(home);
}

// SignupState mirrors FormState — kept as a separate type since farmer
// self-registration is conceptually a different form, even though the
// shape happens to be identical today.
export type SignupState = {
  error?: string;
};

/**
 * Registers a new farmer account via Django's public registration endpoint.
 *
 * Performs client-friendly validation (password match/length, district
 * selected) before hitting the network, so obviously-invalid submissions
 * don't cost a round trip. Does NOT log the user in — Django requires email
 * confirmation first (see project context), so on success this simply
 * redirects to the login page with a flag the login page can use to show a
 * "check your email" style message.
 *
 * @param _prevState Previous form state (unused; useActionState contract).
 * @param formData Submitted registration fields (email, password,
 *   confirmPassword, name, nic, contactNumber, districtId, landSize).
 * @returns `{ error }` on validation/registration failure. On success,
 *   redirects to `/login?registered=1` instead of returning.
 */
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

/**
 * Logs the current user out.
 *
 * Best-effort notifies Django to invalidate/blacklist the refresh token
 * server-side (so it can't be replayed later), then unconditionally clears
 * both local cookies and redirects to `/login` — even if the network call
 * to Django fails, the user should still end up logged out locally, hence
 * the `.catch(() => {})` swallowing that request's errors rather than
 * letting them block the rest of the function.
 *
 * Takes no arguments/form data, so besides being used as a form action it
 * is also called directly as a plain function — e.g. by the IdleGuard
 * component to auto-logout after a period of inactivity.
 */
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
  // Bust the root layout so the header/nav re-renders in its logged-out
  // state on the next navigation.
  revalidatePath("/", "layout");
  redirect("/login");
}
