import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "./jwt";

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  roleName: string;
  permissions: string[];
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
    role: payload.role,
    roleName: payload.role_name,
    permissions: payload.permissions ?? [],
  };
});

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function homeFor(user: AppUser): string {
  return user.role === "farmer" ? "/farmer" : "/dashboard";
}

export async function requireRole(role: string): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) {
    // Send them to their own home, not the page they were denied.
    redirect(homeFor(user));
  }
  return user;
}

export async function requirePermission(codename: string): Promise<AppUser> {
  const user = await requireUser();
  if (!user.permissions.includes(codename)) {
    redirect(homeFor(user));
  }
  return user;
}

export async function requireAnyPermission(...codenames: string[]): Promise<AppUser> {
  const user = await requireUser();
  if (!codenames.some((c) => user.permissions.includes(c))) {
    redirect(homeFor(user));
  }
  return user;
}
