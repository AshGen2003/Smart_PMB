"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type IconProps = { className?: string };

const icons: Record<string, (p: IconProps) => JSX.Element> = {
  dashboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  truck: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" />
      <circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" />
    </svg>
  ),
  driver: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  ),
  route: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" />
      <path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h6" />
    </svg>
  ),
  delivery: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <path d="M3 8l9-4 9 4-9 4-9-4zM3 8v8l9 4 9-4V8" />
    </svg>
  ),
  fuel: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M14 9h3l2 2v8a2 2 0 0 1-2 2h-1" />
    </svg>
  ),
  wrench: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <path d="M14 7a4 4 0 0 0-5.5 5.2L4 17l3 3 4.8-4.5A4 4 0 0 0 17 10l-2.5 2.5L12 11l2.5-2.5z" />
    </svg>
  ),
  pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/vehicles", label: "Vehicles", icon: "truck" },
  { href: "/drivers", label: "Drivers", icon: "driver" },
  { href: "/routes", label: "Routes", icon: "route" },
  { href: "/deliveries", label: "Deliveries", icon: "delivery" },
  { href: "/fuel", label: "Fuel Records", icon: "fuel" },
  { href: "/maintenance", label: "Maintenance", icon: "wrench" },
  { href: "/tracking", label: "GPS Tracking", icon: "pin" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <aside className="flex w-64 flex-col border-r border-pmb-100 bg-pmb-800 text-pmb-50">
      <div className="flex items-center gap-3 border-b border-pmb-700 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M12 3c4 4 4 9 0 12-4-3-4-8 0-12z" />
            <path d="M12 21v-6" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Smart PMB</p>
          <p className="text-xs text-pmb-200">Logistics Module</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = icons[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-pmb-600 text-white shadow-sm"
                  : "text-pmb-100 hover:bg-pmb-700 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-pmb-700 px-3 py-4">
        <button
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-pmb-100 transition hover:bg-pmb-700 hover:text-white"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
