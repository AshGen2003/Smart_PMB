'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, USE_MOCK } from '@/lib/auth';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const onLoginPage = pathname === '/login';

  useEffect(() => {
    if (USE_MOCK) return;
    if (isLoading) return;
    if (!isAuthenticated && !onLoginPage) {
      router.replace('/login');
    } else if (isAuthenticated && onLoginPage) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, pathname, router, onLoginPage]);

  if (USE_MOCK) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center animate-fade-up">
          <div className="mx-auto w-12 h-12 rounded-full bg-forest-500/10 flex items-center justify-center">
            <span className="w-6 h-6 rounded-full border-2 border-forest-500 border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-sm text-forest-800/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !onLoginPage) return null;

  return <>{children}</>;
}
