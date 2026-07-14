"use client";

import { useAuth } from "@/lib/auth";

export default function Topbar() {
  const { user } = useAuth();
  const initials = user
    ? user.username.slice(0, 2).toUpperCase()
    : "··";

  return (
    <header className="flex items-center justify-between border-b border-pmb-100 bg-white px-6 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gold-600">
          Paddy Marketing Board
        </p>
        <h2 className="text-lg font-semibold text-pmb-900">Logistics Control Center</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-pmb-900">{user?.username}</p>
          <p className="text-xs text-pmb-500">{user?.email || "—"}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pmb-700 text-sm font-bold text-white">
          {initials}
        </div>
      </div>
    </header>
  );
}
