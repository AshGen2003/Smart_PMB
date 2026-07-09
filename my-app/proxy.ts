import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/app/lib/jwt";

const PUBLIC_PREFIXES = ["/login", "/signup"];
const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function refreshAccessToken(refreshToken: string) {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { access: string; refresh?: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  const accessToken = request.cookies.get("access_token")?.value;
  let payload = accessToken ? await verifyAccessToken(accessToken) : null;
  let refreshedTokens: { access: string; refresh?: string } | null = null;

  // Optimistic check only — real enforcement happens server-side via
  // app/lib/dal.ts in each layout, per the Next.js auth guide.
  if (!payload) {
    const refreshToken = request.cookies.get("refresh_token")?.value;
    if (refreshToken) {
      refreshedTokens = await refreshAccessToken(refreshToken);
      if (refreshedTokens) {
        payload = await verifyAccessToken(refreshedTokens.access);
        request.cookies.set("access_token", refreshedTokens.access);
        if (refreshedTokens.refresh) {
          request.cookies.set("refresh_token", refreshedTokens.refresh);
        }
      }
    }
  }

  if (!payload && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (payload && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = payload.role === "farmer" ? "/farmer" : "/";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request });
  if (refreshedTokens) {
    response.cookies.set("access_token", refreshedTokens.access, {
      ...cookieOpts,
      maxAge: 60 * 15,
    });
    if (refreshedTokens.refresh) {
      response.cookies.set("refresh_token", refreshedTokens.refresh, {
        ...cookieOpts,
        maxAge: 60 * 60 * 24 * 7,
      });
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
