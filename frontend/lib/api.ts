// Thin API client for the Django + DRF logistics backend.
"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "pmb_token";

export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token: string): void => {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
};

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      const flat = Object.values(err).flat().join(" ");
      if (flat) message = flat;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const login = async (username: string, password: string) => {
  const res = await fetch(`${API_BASE}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid username or password.");
  const data = await res.json();
  setToken(data.token);
  return data;
};

export const getMe = () => apiFetch("/api/auth/me/");

export const list = (endpoint: string, params?: Record<string, any>) => {
  const qs = params
    ? "?" + new URLSearchParams(params as Record<string, string>).toString()
    : "";
  return apiFetch(`/api/${endpoint}/${qs}`);
};

// Returns the raw `results` array from a paginated endpoint.
export const optionsList = async (endpoint: string): Promise<any[]> => {
  const data = await list(endpoint);
  return data?.results || [];
};

export const create = (endpoint: string, data: any) =>
  apiFetch(`/api/${endpoint}/`, { method: "POST", body: JSON.stringify(data) });

export const update = (endpoint: string, id: number, data: any) =>
  apiFetch(`/api/${endpoint}/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const remove = (endpoint: string, id: number) =>
  apiFetch(`/api/${endpoint}/${id}/`, { method: "DELETE" });

export const getDashboard = () => apiFetch("/api/dashboard/");
