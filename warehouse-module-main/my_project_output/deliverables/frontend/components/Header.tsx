'use client';
import { usePathname } from 'next/navigation';

const titles: Record<string,{t:string;s:string}> = {
  '/':           { t:'Warehouse Dashboard', s:'Live stock and intake across all PMB stores' },
  '/warehouses': { t:'Warehouses',          s:'Manage regional stores and capacity' },
  '/intake':     { t:'Stock Intake',        s:'Record a new paddy purchase' },
  '/alerts':     { t:'Capacity Alerts',     s:'Warehouses needing attention' },
};

export default function Header() {
  const pathname = usePathname();
  const key = Object.keys(titles).find(k => k !== '/' && pathname.startsWith(k)) ?? '/';
  const { t, s } = titles[key];

  return (
    <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur-md border-b border-forest-600/10 px-6 md:px-8 py-4 flex items-center gap-4">
      <div className="animate-fade-up">
        <h1 className="text-xl md:text-2xl font-bold text-forest-700 tracking-tight">{t}</h1>
        <p className="text-xs md:text-sm text-forest-800/50 mt-0.5">{s}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* On-duty pill */}
        <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-500/10 text-forest-600 text-xs font-semibold">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-forest-500 animate-pulse-dot" />
            <span className="relative w-2 h-2 rounded-full bg-forest-500" />
          </span>
          On duty
        </span>

        {/* Notification bell */}
        <button className="relative w-10 h-10 rounded-full bg-white border border-forest-600/10 shadow-soft flex items-center justify-center hover:scale-105 transition-transform">
          <svg className="w-5 h-5 text-forest-700" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amberpmb text-[10px] font-bold text-white flex items-center justify-center shadow">3</span>
        </button>

        {/* User chip */}
        <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full bg-white border border-forest-600/10 shadow-soft hover:shadow-md transition">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest-500 to-forest-700 text-cream text-sm font-semibold flex items-center justify-center ring-2 ring-amberpmb/40">
            NP
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-sm font-semibold text-forest-700">Nimal Perera</div>
            <div className="text-[11px] text-forest-800/50 uppercase tracking-wider">PMB Officer</div>
          </div>
        </div>
      </div>
    </header>
  );
}
