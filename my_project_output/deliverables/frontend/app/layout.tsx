import type { Metadata } from 'next';
import './globals.css';
import RouteGuard from '@/components/RouteGuard';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'SMART PMB — Warehouse & Stock',
  description: "Digital ecosystem for Sri Lanka's Paddy Marketing Board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-forest-800 antialiased">
        <Providers>
          <RouteGuard>{children}</RouteGuard>
        </Providers>
      </body>
    </html>
  );
}
