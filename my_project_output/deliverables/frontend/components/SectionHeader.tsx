export default function SectionHeader({ label, action }:{ label:string; action?:React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-up">
      <span className="w-1 h-5 rounded-full bg-amberpmb" />
      <h2 className="text-xs font-bold tracking-[0.18em] text-forest-800/60 uppercase">{label}</h2>
      <div className="flex-1 h-px bg-forest-600/10" />
      {action}
    </div>
  );
}
