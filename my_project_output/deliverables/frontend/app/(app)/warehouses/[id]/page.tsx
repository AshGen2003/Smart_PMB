'use client';
import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import SectionHeader from '@/components/SectionHeader';
import StatusBadge from '@/components/StatusBadge';
import Modal, { Button } from '@/components/Modal';
import DeliveryModal from '@/components/DeliveryModal';
import { DataTable, TR, TD } from '@/components/DataTable';
import { fmtKg } from '@/lib/format';
import { useWarehouseDetail, useWarehouseInventory, useCreatePurchase } from '@/lib/hooks';

export default function WarehouseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const { data: w, isLoading } = useWarehouseDetail(numId);
  const { data: inv = [] } = useWarehouseInventory(numId);
  const [modal, setModal] = useState<null | 'add' | 'remove'>(null);

  if (isLoading) return <div className="text-center text-forest-800/50 text-sm py-8">Loading...</div>;
  if (!w) return notFound();

  const maxQty = Math.max(...inv.map((i: any) => i.quantity_kg), 1);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <section className="rounded-2xl bg-gradient-to-br from-forest-600 to-forest-800 text-cream p-6 md:p-8 shadow-soft animate-fade-up relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-amberpmb/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-cream/60">{w.district}</div>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">{w.name}</h2>
            <div className="text-sm text-cream/70 mt-1">{w.location}</div>
          </div>
          <StatusBadge status={w.status} />
        </div>
        <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Capacity',       fmtKg(w.capacity_kg)],
            ['Current Stock',  fmtKg(w.current_stock_kg)],
            ['Utilization',    `${w.utilization_pct}%`],
            ['Remaining',      fmtKg(Number(w.capacity_kg) - Number(w.current_stock_kg))],
          ].map(([l,v],i) => (
            <div key={l} style={{animationDelay:`${i*80}ms`}} className="animate-fade-up">
              <div className="text-[11px] uppercase tracking-wider text-cream/50">{l}</div>
              <div className="text-xl font-bold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        <div className="relative mt-6 flex gap-3">
          <Button onClick={()=>setModal('add')}>+ Add Stock</Button>
          <Button variant="outline" onClick={()=>setModal('remove')}
            className="!border-cream/30 !text-cream hover:!bg-white/10">− Remove Stock</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader label="Inventory Breakdown" />
          {inv.length === 0 ? (
            <div className="rounded-2xl bg-white border border-forest-600/10 p-8 text-center text-sm text-forest-800/60 shadow-soft">No inventory records.</div>
          ) : (
            <DataTable columns={['Paddy Type','Quantity','Storage Date']}>
              {inv.map((row: any) => (
                <TR key={row.inventory_id}>
                  <TD className="font-semibold text-forest-700">{row.paddy_type}</TD>
                  <TD>{fmtKg(row.quantity_kg)}</TD>
                  <TD className="text-forest-800/60">{row.storage_date}</TD>
                </TR>
              ))}
            </DataTable>
          )}
        </div>

        <div>
          <SectionHeader label="Stock by Paddy Type" />
          <div className="rounded-2xl bg-white border border-forest-600/10 p-5 shadow-soft animate-fade-up space-y-4">
            {inv.map((row: any,i: number) => (
              <div key={row.inventory_id} style={{animationDelay:`${i*80}ms`}} className="animate-fade-up">
                <div className="flex items-center justify-between text-xs text-forest-800/70 mb-1.5">
                  <span className="font-medium">{row.paddy_type}</span>
                  <span className="font-bold text-forest-700">{fmtKg(row.quantity_kg)}</span>
                </div>
                <div className="h-3 rounded-full bg-forest-50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-forest-500 bar-fill relative overflow-hidden"
                    style={{ width: `${(row.quantity_kg/maxQty)*100}%` }}>
                    <div className="absolute inset-0 shimmer opacity-40" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Modal open={modal==='add'} onClose={()=>setModal(null)} title="Record Stock Intake">
        <StockForm warehouseId={w.warehouse_id} onDone={()=>setModal(null)} />
      </Modal>
      <DeliveryModal
        open={modal==='remove'}
        onClose={()=>setModal(null)}
        warehouseId={w.warehouse_id}
        warehouseName={w.name}
        defaultQty={0}
      />
    </div>
  );
}

function StockForm({ warehouseId, onDone }:{
  warehouseId:number; onDone:()=>void;
}) {
  const createPurchase = useCreatePurchase();
  const [farmer, setFarmer] = useState('');
  const [type, setType] = useState('Nadu');
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qtyNum = Number(qty);
    if (!farmer.trim()) return setError('Farmer name is required.');
    if (!qtyNum || qtyNum <= 0) return setError('Quantity must be greater than 0.');
    if (Number(amount) < 0) return setError('Amount must be a valid number.');
    try {
      await createPurchase.mutateAsync({
        farmer_name: farmer.trim(),
        warehouse_id: warehouseId,
        paddy_type: type,
        quantity_kg: qtyNum,
        amount_lkr: Number(amount || 0),
      });
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Failed to record intake.');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Farmer / Buyer">
        <input value={farmer} onChange={e=>setFarmer(e.target.value)} className={inputCls} placeholder="e.g. Sunil Rathnayake" required/>
      </Field>
      <Field label="Paddy Type">
        <select value={type} onChange={e=>setType(e.target.value)} className={inputCls}>
          {['Nadu','Samba','Keeri Samba','Red Raw'].map(o=><option key={o}>{o}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantity (kg)">
          <input value={qty} onChange={e=>setQty(e.target.value)} type="number" min="1" className={inputCls} required/>
        </Field>
        <Field label="Amount (LKR)">
          <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" className={inputCls}/>
        </Field>
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 animate-pop">{error}</div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={createPurchase.isPending}>
          {createPurchase.isPending ? 'Recording...' : 'Add to warehouse'}
        </Button>
      </div>
    </form>
  );
}
const inputCls = 'w-full px-3 py-2 rounded-lg border border-forest-600/15 bg-cream/50 focus:outline-none focus:ring-2 focus:ring-forest-500/40 text-sm';
function Field({ label, children }:{ label:string; children:React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-forest-800/60 mb-1">{label}</span>
      {children}
    </label>
  );
}
