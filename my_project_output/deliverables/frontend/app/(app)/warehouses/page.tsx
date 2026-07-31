'use client';
import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import WarehouseCard from '@/components/WarehouseCard';
import WarehouseModal from '@/components/WarehouseModal';
import { Button } from '@/components/Modal';
import { useWarehouses } from '@/lib/hooks';

export default function WarehousesIndex() {
  const { data: warehouses = [], isLoading } = useWarehouses();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader label="All Warehouses" />
        <Button onClick={() => setShowModal(true)}>+ New Warehouse</Button>
      </div>
      {isLoading ? (
        <div className="text-center text-forest-800/50 text-sm py-8">Loading warehouses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map((w: any,i: number) => <WarehouseCard key={w.warehouse_id} w={w} delay={i*80}/>)}
        </div>
      )}
      <WarehouseModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
