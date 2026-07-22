import Link from 'next/link';
import type { Warehouse } from '@/lib/data';
import { fmtKg } from '@/lib/format';
import StatusBadge from './StatusBadge';

export default function WarehouseCard({ w, delay=0 }:{ w:Warehouse; delay?:number }) {
  const pct = w.utilization_pct;
  const barColor =
    pct >= 85 ? 'from-rose-400 to-rose-600' :
    pct >= 60 ? 'from-amber-400 to-orange-500' :
                'from-emerald-400 to-forest-500';

  return (
    <Link href={`/warehouses/${w.warehouse_id}`}
      style={{ animationDelay:`${delay}ms` }}
      className="group block rounded-2xl bg-white border border-forest-600/10 p-5 shadow-soft card-lift animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-forest-800/50">{w.district}</div>
          <h3 className="mt-0.5 font-semibold text-forest-700 group-hover:text-forest-500 transition">{w.name}</h3>
          <div className="text-xs text-forest-800/60 mt-0.5">{w.location}</div>
        </div>
        <StatusBadge status={w.status} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-forest-800/70">
          <span>{fmtKg(w.current_stock_kg)} <span className="opacity-60">/ {fmtKg(w.capacity_kg)}</span></span>
          <span className="font-bold text-forest-700">{pct}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-forest-600/10 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} bar-fill relative overflow-hidden`}
            style={{ width: `${Math.min(pct,100)}%` }}
          >
            <div className="absolute inset-0 shimmer opacity-40" />
          </div>
        </div>
      </div>
    </Link>
  );
}
