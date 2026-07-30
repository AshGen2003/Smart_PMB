'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href:'/',           label:'Dashboard',  icon:'M3 12l9-9 9 9M5 10v10h14V10' },
  { href:'/warehouses', label:'Warehouses', icon:'M3 21V8l9-5 9 5v13M9 21V12h6v9' },
  { href:'/intake',     label:'Intake',     icon:'M12 4v16m8-8H4' },
  { href:'/alerts',     label:'Alerts',     icon:'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-[84px] bg-gradient-to-b from-forest-700 to-forest-600 text-forest-50 flex flex-col items-center py-5 shadow-2xl">
      {/* Logo circle */}
      <div className="relative w-11 h-11 rounded-full bg-forest-800 ring-2 ring-forest-400/50 flex items-center justify-center font-bold text-cream shadow-pill animate-pop">
        <span className="text-sm tracking-tight">PMB</span>
        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amberpmb ring-2 ring-forest-700 animate-pulse-dot" />
      </div>

      <nav className="mt-8 flex flex-col gap-2 w-full items-center">
        {items.map((it,i) => {
          const active = pathname === it.href ||
                         (it.href !== '/' && pathname.startsWith(it.href));
          return (
            <Link key={it.href} href={it.href}
              style={{ animationDelay: `${i*60}ms` }}
              className={`group relative w-16 h-16 flex flex-col items-center justify-center rounded-xl transition-all duration-300 animate-slide-in
                ${active
                  ? 'bg-forest-500/70 shadow-pill scale-[1.02]'
                  : 'hover:bg-forest-500/40 hover:scale-105'}`}>
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amberpmb animate-fade-in" />
              )}
              <svg className={`w-5 h-5 mb-1 transition-transform ${active?'text-cream':'text-forest-100'} group-hover:-translate-y-0.5`}
                fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={it.icon} />
              </svg>
              <span className={`text-[10px] font-medium tracking-wide ${active?'text-cream':'text-forest-100/80'}`}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto text-[9px] text-forest-100/60 tracking-widest">v1.0</div>
    </aside>
  );
}
