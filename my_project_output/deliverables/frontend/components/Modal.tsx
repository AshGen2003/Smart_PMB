'use client';
import { ReactNode, useEffect } from 'react';

export default function Modal({
  open, onClose, title, children,
}: { open:boolean; onClose:()=>void; title:string; children:ReactNode }) {
  useEffect(() => {
    const onKey = (e:KeyboardEvent) => e.key==='Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-forest-800/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-pop">
        <div className="flex items-center justify-between px-6 py-4 border-b border-forest-600/10">
          <h3 className="font-semibold text-forest-700">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-forest-50 flex items-center justify-center text-forest-700">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Button({ variant='primary', className='', ...p }:
  { variant?:'primary'|'outline' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95';
  const style = variant==='primary'
    ? 'bg-forest-600 hover:bg-forest-500 text-cream shadow-pill'
    : 'border border-forest-600/20 text-forest-700 hover:bg-forest-50';
  return <button {...p} className={`${base} ${style} ${className}`} />;
}
