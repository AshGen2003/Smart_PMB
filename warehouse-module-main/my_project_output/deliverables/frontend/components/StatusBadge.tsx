type Kind = 'success'|'warn'|'danger'|'info'|'neutral';
const map: Record<Kind,{dot:string;bg:string;fg:string}> = {
  success:{ dot:'bg-emerald-500', bg:'bg-emerald-50',  fg:'text-emerald-700' },
  warn:   { dot:'bg-amber-500',   bg:'bg-amber-50',    fg:'text-amber-700' },
  danger: { dot:'bg-rose-500',    bg:'bg-rose-50',     fg:'text-rose-700' },
  info:   { dot:'bg-sky-500',     bg:'bg-sky-50',      fg:'text-sky-700' },
  neutral:{ dot:'bg-slate-400',   bg:'bg-slate-100',   fg:'text-slate-700' },
};
const kindByStatus: Record<string,Kind> = {
  COMPLETED:'success', ACTIVE:'success', PAID:'success',
  PENDING:'warn', MAINTENANCE:'warn', SCHEDULED:'info', IN_TRANSIT:'info',
  FAILED:'danger', INACTIVE:'neutral', DELIVERED:'success',
};

export default function StatusBadge({ status }:{ status:string }) {
  const k = kindByStatus[status] ?? 'neutral';
  const s = map[k];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${s.bg} ${s.fg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse-dot`} />
      {status}
    </span>
  );
}
