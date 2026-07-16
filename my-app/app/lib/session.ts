import { cookies } from "next/headers";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setTokenCookies(access: string, refresh: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, access, { ...cookieOpts, maxAge: 60 * 15 });
  cookieStore.set(REFRESH_COOKIE, refresh, {
    ...cookieOpts,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearTokenCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
