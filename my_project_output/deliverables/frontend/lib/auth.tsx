'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from './api';

const USE_MOCK = typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (USE_MOCK) {
        setUser({ id: 1, email: 'admin@pmb.lk', first_name: 'Admin', last_name: 'PMB', role: 'PMB_OFFICER' });
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.auth.me();
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.auth.login(email, password);
    setAccessToken(res.access);
    setUser(res.user);
  }

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (USE_MOCK) return;
    try {
      const res = await api.auth.me();
      setUser(res.user);
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { USE_MOCK };
