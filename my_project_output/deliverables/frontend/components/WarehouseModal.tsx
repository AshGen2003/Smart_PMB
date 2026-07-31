'use client';
import { useState } from 'react';
import Modal, { Button } from '@/components/Modal';
import { useCreateWarehouse } from '@/lib/hooks';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-forest-600/15 bg-cream/50 focus:outline-none focus:ring-2 focus:ring-forest-500/40 text-sm';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-forest-800/60 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function WarehouseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createWarehouse = useCreateWarehouse();
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Warehouse name is required.');
    if (!district.trim()) return setError('District is required.');
    const cap = Number(capacity);
    if (!cap || cap <= 0) return setError('Capacity must be greater than 0.');

    try {
      await createWarehouse.mutateAsync({
        name: name.trim(),
        district: district.trim(),
        location: location.trim() || district.trim(),
        capacity_kg: cap,
        status,
      });
      setName('');
      setDistrict('');
      setLocation('');
      setCapacity('');
      setStatus('ACTIVE');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create warehouse.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Warehouse">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Warehouse Name">
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Polonnaruwa Central Store" required />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="District">
            <input value={district} onChange={e => setDistrict(e.target.value)} className={inputCls} placeholder="e.g. Polonnaruwa" required />
          </Field>
          <Field label="Capacity (kg)">
            <input value={capacity} onChange={e => setCapacity(e.target.value)} type="number" min="1" className={inputCls} placeholder="e.g. 500000" required />
          </Field>
        </div>
        <Field label="Location">
          <input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} placeholder="e.g. Kaduruwela Rd" />
        </Field>
        <Field label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
            {['ACTIVE', 'MAINTENANCE', 'INACTIVE'].map(o => <option key={o}>{o}</option>)}
          </select>
        </Field>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 animate-pop">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createWarehouse.isPending}>
            {createWarehouse.isPending ? 'Creating...' : 'Create warehouse'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
