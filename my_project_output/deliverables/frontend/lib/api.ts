const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const TOKEN_KEY = 'pmb_access_token';

let accessToken: string | null = null;
if (typeof window !== 'undefined') {
  accessToken = window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken() {
  return accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
      if (!retryRes.ok) throw await buildError(retryRes);
      return retryRes.json();
    }
  }

  if (!res.ok) throw await buildError(res);
  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.access;
    return true;
  } catch {
    return false;
  }
}

async function buildError(res: Response) {
  let body: any;
  try { body = await res.json(); } catch { body = {}; }
  const err = new Error(body?.error?.message || `Request failed (${res.status})`);
  (err as any).status = res.status;
  (err as any).code = body?.error?.code || 'UNKNOWN';
  return err;
}

// --- Auth ---
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access: string; user: any }>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    refresh: () => request<{ access: string }>('/auth/refresh/', { method: 'POST' }),
    logout: () => request<{ ok: boolean }>('/auth/logout/', { method: 'POST' }),
    me: () => request<{ user: any }>('/auth/me/'),
  },

  warehouses: {
    list: () => request<{ warehouses: any[] }>('/warehouses/'),
    detail: (id: number) => request<{ warehouse: any }>(`/warehouses/${id}/`),
    inventory: (id: number) => request<{ inventory: any[] }>(`/warehouses/${id}/inventory/`),
    create: (data: any) =>
      request<{ warehouse: any }>('/warehouses/create/', { method: 'POST', body: JSON.stringify(data) }),
    alerts: () => request<{ alerts: any[] }>('/warehouses/alerts/capacity/'),
  },

  purchases: {
    list: (status?: string) =>
      request<{ purchases: any[] }>(`/purchases/${status ? `?status=${status}` : ''}`),
    create: (data: any) =>
      request<{ purchase: any }>('/purchases/create/', { method: 'POST', body: JSON.stringify(data) }),
  },

  deliveries: {
    list: () => request<{ deliveries: any[] }>('/deliveries/'),
    create: (data: any) =>
      request<{ delivery: any }>('/deliveries/create/', { method: 'POST', body: JSON.stringify(data) }),
  },

  approvals: {
    recent: () => request<{ approvals: any[] }>('/approvals/recent/'),
  },

  dashboard: {
    kpis: () => request<{ kpis: any }>('/dashboard/kpis/'),
  },

  health: () => request<{ ok: boolean }>('/health/'),
};
