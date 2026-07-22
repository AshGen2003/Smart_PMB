import SectionHeader from '@/components/SectionHeader';
import WarehouseCard from '@/components/WarehouseCard';
import { warehouses } from '@/lib/data';

export default function WarehousesIndex() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <SectionHeader label="All Warehouses" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {warehouses.map((w,i) => <WarehouseCard key={w.warehouse_id} w={w} delay={i*80}/>)}
      </div>
    </div>
  );
}
