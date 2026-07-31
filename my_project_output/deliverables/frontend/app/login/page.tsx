'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('Email and password are required.');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-forest-600 to-forest-800 text-cream font-bold flex items-center justify-center shadow-pill animate-pop">
            PMB
          </div>
          <h1 className="mt-4 text-2xl font-bold text-forest-700 tracking-tight">SMART PMB</h1>
          <p className="text-sm text-forest-800/50 mt-1">Warehouse & Stock Management</p>
        </div>

        <div className="rounded-2xl bg-white border border-forest-600/10 shadow-soft p-6 md:p-8">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-forest-800/60 mb-1">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pmb.lk"
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border border-forest-600/15 bg-cream/40 focus:outline-none focus:ring-2 focus:ring-forest-500/40 text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-forest-800/60 mb-1">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-lg border border-forest-600/15 bg-cream/40 focus:outline-none focus:ring-2 focus:ring-forest-500/40 text-sm"
              />
            </label>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 animate-pop">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-forest-600 to-forest-700 text-cream font-semibold text-sm shadow-pill hover:opacity-95 transition disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-forest-800/40 mt-6">
          Default demo account: admin@pmb.lk / admin123
        </p>
      </div>
    </div>
  );
}
