import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'SMART PMB — Warehouse & Stock',
  description: "Digital ecosystem for Sri Lanka's Paddy Marketing Board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-forest-800 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="ml-[84px] flex-1 flex flex-col">
            <Header />
            <main className="p-6 md:p-8 animate-fade-in">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
