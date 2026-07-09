import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "./jwt";

export type UserRole =
  | "admin"
  | "moderator"
  | "pmb_officer"
  | "farmer"
  | "mill_owner"
  | "driver"
  | "warehouse_manager"
  | "authorized_purchaser";

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
};

// Verifies the Django-issued JWT signature/expiry on every call within a
// request (cached per-request) rather than trusting the proxy's optimistic
// check alone.
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    fullName: payload.full_name || null,
    role: payload.role as UserRole,
  };
});

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: UserRole): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) {
    // Send them to their own home, not the page they were denied.
    redirect(user.role === "farmer" ? "/farmer" : "/");
  }
  return user;
}
