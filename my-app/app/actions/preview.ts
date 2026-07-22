/**
 * Server Actions for "Portal Preview": lets an admin see the app exactly as
 * a given role would (real pages, real navigation, a persistent banner)
 * without logging in as anyone else. See lib/dal.ts's getCurrentUser() for
 * how the cookie set here actually swaps the rendered role/permissions.
 */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission, PREVIEW_COOKIE } from "@/app/lib/dal";

/**
 * Starts previewing as the given role (by slug) and redirects to the
 * dashboard. Only reachable by manage_roles holders — requirePermission
 * redirects anyone else away before the cookie is ever set. Previewing
 * "admin" is rejected outright: the admin is the one doing the previewing,
 * and getCurrentUser() would otherwise swap them into their own real
 * permissions, defeating the read-only sample-data guarantee for no reason.
 */
export async function enterPreview(roleSlug: string) {
  await requirePermission("manage_roles");

  if (roleSlug === "admin") {
    redirect("/preview");
  }

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_COOKIE, roleSlug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour — a preview session shouldn't quietly outlive the tab
  });

  redirect("/dashboard");
}

/** Ends the current preview (if any) and returns to the real admin dashboard. */
export async function exitPreview() {
  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_COOKIE);
  redirect("/dashboard");
}
