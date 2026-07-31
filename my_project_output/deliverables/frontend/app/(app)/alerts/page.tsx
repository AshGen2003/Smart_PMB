'use client';
import SectionHeader from '@/components/SectionHeader';
import { useCapacityAlerts } from '@/lib/hooks';

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useCapacityAlerts();

  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader label="Notifications" />

      {isLoading ? (
        <div className="text-center text-forest-800/50 text-sm py-8">Loading alerts...</div>
      ) : (
        <ul className="rounded-2xl bg-white border border-forest-600/10 shadow-soft divide-y divide-forest-600/5 animate-fade-up">
          {alerts.length === 0 && (
            <li className="p-8 text-center text-sm text-forest-800/60">All warehouses within healthy range.</li>
          )}
          {alerts.map((a: any, i: number) => {
            const w = a.warehouse || a.w;
            const level = a.level || (a.warehouse?.alert_level);
            const msg = a.message || a.msg;
            const isHigh = level === 'high';
            const dot = isHigh ? 'bg-rose-500' : 'bg-amber-500';
            const wrap = isHigh ? 'bg-rose-50/40' : 'bg-amber-50/40';
            return (
              <li key={w?.warehouse_id ?? i}
                  style={{animationDelay:`${i*80}ms`}}
                  className={`p-4 flex items-start gap-3 animate-slide-in hover:bg-forest-50/40 transition ${wrap}`}>
                <span className="relative flex w-2.5 h-2.5 mt-1.5 shrink-0">
                  <span className={`absolute inset-0 rounded-full ${dot} animate-pulse-dot`} />
                  <span className={`relative w-2.5 h-2.5 rounded-full ${dot}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-forest-800">{msg}</div>
                  <div className="text-xs text-forest-800/50 mt-0.5">{w?.district} · {w?.location}</div>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isHigh?'text-rose-600':'text-amber-600'}`}>
                  {isHigh ? 'High' : 'Low'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
