import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL!;

// For authenticated calls from Server Components/Actions — attaches the
// access_token cookie as a Bearer header automatically.
export async function apiFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  const headers = new Headers(init.headers);
  // Let fetch set the multipart boundary itself for FormData bodies —
  // forcing application/json would break file uploads.
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
