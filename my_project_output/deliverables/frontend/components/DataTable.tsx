import { ReactNode } from 'react';

export function DataTable({ columns, children }:{ columns:string[]; children:ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-forest-600/10 shadow-soft overflow-hidden animate-fade-up">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-forest-50/60 text-forest-800/60 text-[11px] uppercase tracking-wider">
            {columns.map(c => <th key={c} className="text-left font-semibold px-4 py-3">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-forest-600/5">{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children }:{ children:ReactNode }) {
  return <tr className="hover:bg-forest-50/40 transition-colors">{children}</tr>;
}
export function TD({ children, className='' }:{ children:ReactNode; className?:string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
