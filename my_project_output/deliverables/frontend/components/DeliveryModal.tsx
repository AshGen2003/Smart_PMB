'use client';
import { useState } from 'react';
import Modal, { Button } from '@/components/Modal';
import { fmtKg } from '@/lib/format';
import { useCreateDelivery } from '@/lib/hooks';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-forest-600/15 bg-cream/50 focus:outline-none focus:ring-2 focus:ring-forest-500/40 text-sm';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-forest-800/60 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function DeliveryModal({
  open, onClose, warehouseId, warehouseName, defaultQty,
}: {
  open: boolean;
  onClose: () => void;
  warehouseId: number;
  warehouseName: string;
  defaultQty: number;
}) {
  const createDelivery = useCreateDelivery();
  const [qty, setQty] = useState(String(defaultQty));
  const [pickup, setPickup] = useState(warehouseName);
  const [drop, setDrop] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return setError('Quantity must be greater than 0.');
    if (!drop.trim()) return setError('Drop location is required.');

    try {
      await createDelivery.mutateAsync({
        warehouse_id: warehouseId,
        quantity_kg: qtyNum,
        pickup_location: pickup.trim() || warehouseName,
        drop_location: drop.trim(),
        vehicle_number: vehicle.trim(),
        driver_name: driver.trim(),
      });
      setQty(String(defaultQty));
      setDrop('');
      setVehicle('');
      setDriver('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create delivery.');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Delivery">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-cream border border-forest-600/10 px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-forest-800/50 font-semibold">From</div>
          <div className="font-semibold text-forest-700 mt-0.5">{warehouseName}</div>
        </div>

        <Field label="Quantity (kg)">
          <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" className={inputCls} required />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Pickup Location">
            <input value={pickup} onChange={e => setPickup(e.target.value)} className={inputCls} placeholder={warehouseName} />
          </Field>
          <Field label="Drop Location">
            <input value={drop} onChange={e => setDrop(e.target.value)} className={inputCls} placeholder="e.g. Colombo 11" required />
          </Field>
          <Field label="Vehicle Number">
            <input value={vehicle} onChange={e => setVehicle(e.target.value)} className={inputCls} placeholder="e.g. WP-LC-4521" />
          </Field>
          <Field label="Driver Name">
            <input value={driver} onChange={e => setDriver(e.target.value)} className={inputCls} placeholder="e.g. Kamal Silva" />
          </Field>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 animate-pop">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createDelivery.isPending}>
            {createDelivery.isPending ? 'Assigning...' : 'Assign delivery'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
