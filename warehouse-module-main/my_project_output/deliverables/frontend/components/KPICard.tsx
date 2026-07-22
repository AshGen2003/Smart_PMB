'use client';
import { ReactNode } from 'react';

// Five gradient variants so the KPI row isn't monotone.
type Tone = 'amber'|'mid'|'pale'|'dark'|'forest';
const tones: Record<Tone,{bg:string;fg:string;iconBg:string;shine:string}> = {
  amber:  { bg:'bg-gradient-to-br from-amber-300 to-orange-500',  fg:'text-white', iconBg:'bg-white/25', shine:'from-white/40' },
  mid:    { bg:'bg-gradient-to-br from-emerald-400 to-forest-500', fg:'text-white', iconBg:'bg-white/20', shine:'from-white/30' },
  pale:   { bg:'bg-gradient-to-br from-emerald-50 to-emerald-100', fg:'text-forest-700', iconBg:'bg-forest-500/10', shine:'from-forest-600/10' },
  dark:   { bg:'bg-gradient-to-br from-forest-600 to-forest-800', fg:'text-cream', iconBg:'bg-amberpmb/25', shine:'from-amberpmb/30' },
  forest: { bg:'bg-gradient-to-br from-forest-500 to-forest-700', fg:'text-cream', iconBg:'bg-white/15', shine:'from-white/20' },
};

export default function KPICard({
  label, value, hint, icon, tone='pale', delay=0,
}: {
  label:string; value:string|number; hint?:string; icon:ReactNode;
  tone?:Tone; delay?:number;
}) {
  const t = tones[tone];
  return (
    <div
      style={{ animationDelay:`${delay}ms` }}
      className={`relative overflow-hidden rounded-2xl p-5 shadow-soft card-lift animate-fade-up ${t.bg} ${t.fg}`}
    >
      {/* Shine sweep */}
      <div className={`pointer-events-none absolute -inset-x-4 -top-16 h-32 rotate-12 bg-gradient-to-r ${t.shine} to-transparent shimmer opacity-70`} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.iconBg} backdrop-blur-sm`}>
        {icon}
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider opacity-80">{label}</div>
      {hint && <div className="mt-2 text-[11px] opacity-70">{hint}</div>}
    </div>
  );
}
