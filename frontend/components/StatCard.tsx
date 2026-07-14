"use client";

import { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  hint,
  accent = "pmb",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "pmb" | "gold";
  icon?: ReactNode;
}) {
  const accentRing =
    accent === "gold" ? "ring-gold-200 bg-gold-50" : "ring-pmb-100 bg-pmb-50";
  const accentText = accent === "gold" ? "text-gold-600" : "text-pmb-600";
  return (
    <div className={`card flex items-center gap-4 p-5 ring-1 ${accentRing}`}>
      {icon && (
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentText} bg-white`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-pmb-600">{label}</p>
        <p className="text-2xl font-bold text-pmb-900">{value}</p>
        {hint && <p className="text-xs text-pmb-500">{hint}</p>}
      </div>
    </div>
  );
}
