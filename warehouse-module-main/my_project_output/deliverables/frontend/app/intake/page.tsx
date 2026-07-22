'use client';
import { useMemo, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { Button } from '@/components/Modal';
import { warehouses } from '@/lib/data';
import { fmtKg } from '@/lib/format';

// Client-side + (would be) server-side validated intake form.
// Rule: quantity cannot exceed target warehouse's remaining capacity.
export default function IntakePage() {
  const [farmer, setFarmer] = useState('');
  const [paddy, setPaddy] = useState('Nadu');
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [warehouseId, setWarehouseId] = useState<number>(warehouses[0].warehouse_id);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const target = warehouses.find(w => w.warehouse_id === warehouseId)!;
  const remaining = target.capacity_kg - target.current_stock_kg;
  const qtyNum = Number(qty || 0);
  const wouldOverflow = qtyNum > remaining;
  const pctAfter = useMemo(
    () => Math.min(100, ((target.current_stock_kg + qtyNum) / target.capacity_kg) * 100),
    [target, qtyNum]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!farmer.trim()) return setError('Farmer name is required.');
    if (!qtyNum || qtyNum <= 0) return setError('Quantity must be greater than 0.');
    if (wouldOverflow) return setError(`Exceeds capacity — only ${fmtKg(remaining)} available.`);
    if (!Number(amount) || Number(amount) < 0) return setError('Amount must be a valid number.');
    setSubmitted(true);
  }

  return (
    <div className="max-w-3xl">
      <SectionHeader label="Record Purchase Intake" />

      <div className="rounded-2xl bg-white border border-forest-600/10 shadow-soft p-6 md:p-8 animate-fade-up">
        {submitted ? (
          <div className="text-center py-8 animate-pop">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
            <h3 className="mt-4 font-semibold text-forest-700">Intake recorded</h3>
            <p className="text-sm text-forest-800/60 mt-1">
              {fmtKg(qtyNum)} of {paddy} added to {target.name}.
            </p>
            <Button className="mt-6" onClick={()=>{ setSubmitted(false); setFarmer(''); setQty(''); setAmount(''); }}>
              Record another
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Farmer / Buyer">
                <input value={farmer} onChange={e=>setFarmer(e.target.value)} className={inputCls} placeholder="e.g. Sunil Rathnayake"/>
              </Field>
              <Field label="Paddy Type">
                <select value={paddy} onChange={e=>setPaddy(e.target.value)} className={inputCls}>
                  {['Nadu','Samba','Keeri Samba','Red Raw'].map(o=><option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Quantity (kg)">
                <input value={qty} onChange={e=>setQty(e.target.value)} type="number" min="1" className={inputCls}/>
              </Field>
              <Field label="Amount (LKR)">
                <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" className={inputCls}/>
              </Field>
              <Field label="Target Warehouse" className="md:col-span-2">
                <select value={warehouseId} onChange={e=>setWarehouseId(Number(e.target.value))} className={inputCls}>
                  {warehouses.map(w =>
                    <option key={w.warehouse_id} value={w.warehouse_id}>
                      {w.name} — {fmtKg(w.capacity_kg - w.current_stock_kg)} free
                    </option>)}
                </select>
              </Field>
            </div>

            {/* Live capacity preview */}
            <div className="rounded-xl bg-cream border border-forest-600/10 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-forest-800/60 uppercase tracking-wider font-semibold">Projected utilization</span>
                <span className={`font-bold ${wouldOverflow?'text-rose-600':'text-forest-700'}`}>{pctAfter.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-forest-600/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    wouldOverflow
                      ? 'bg-gradient-to-r from-rose-400 to-rose-600'
                      : 'bg-gradient-to-r from-emerald-400 to-forest-500'
                  }`}
                  style={{ width: `${pctAfter}%` }}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 animate-pop">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={()=>{ setFarmer(''); setQty(''); setAmount(''); }}>Reset</Button>
              <Button type="submit">Record intake</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-forest-600/15 bg-cream/40 focus:outline-none focus:ring-2 focus:ring-forest-500/40 text-sm';
function Field({ label, children, className='' }:{ label:string; children:React.ReactNode; className?:string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-forest-800/60 mb-1">{label}</span>
      {children}
    </label>
  );
}
