import SectionHeader from '@/components/SectionHeader';
import { capacityAlerts } from '@/lib/data';

export default function AlertsPage() {
  const alerts = capacityAlerts();
  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader label="Notifications" />

      <ul className="rounded-2xl bg-white border border-forest-600/10 shadow-soft divide-y divide-forest-600/5 animate-fade-up">
        {alerts.length === 0 && (
          <li className="p-8 text-center text-sm text-forest-800/60">All warehouses within healthy range.</li>
        )}
        {alerts.map((a, i) => {
          const isHigh = a.level === 'high';
          const dot = isHigh ? 'bg-rose-500' : 'bg-amber-500';
          const wrap = isHigh ? 'bg-rose-50/40' : 'bg-amber-50/40';
          return (
            <li key={a.w.warehouse_id}
                style={{animationDelay:`${i*80}ms`}}
                className={`p-4 flex items-start gap-3 animate-slide-in hover:bg-forest-50/40 transition ${wrap}`}>
              <span className="relative flex w-2.5 h-2.5 mt-1.5 shrink-0">
                <span className={`absolute inset-0 rounded-full ${dot} animate-pulse-dot`} />
                <span className={`relative w-2.5 h-2.5 rounded-full ${dot}`} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-forest-800">{a.msg}</div>
                <div className="text-xs text-forest-800/50 mt-0.5">{a.w.district} · {a.w.location}</div>
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isHigh?'text-rose-600':'text-amber-600'}`}>
                {isHigh ? 'High' : 'Low'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
