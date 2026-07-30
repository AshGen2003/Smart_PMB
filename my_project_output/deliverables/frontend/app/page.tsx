'use client';
import KPICard from '@/components/KPICard';
import SectionHeader from '@/components/SectionHeader';
import WarehouseCard from '@/components/WarehouseCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/Modal';
import { DataTable, TR, TD } from '@/components/DataTable';
import { fmtKg, fmtLKR, fmtDate } from '@/lib/format';
import { useDashboardKpis, useWarehouses, usePurchases, useApprovals } from '@/lib/hooks';

const Ico = {
  store: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 9l9-6 9 6v11H3zM9 20v-6h6v6"/></svg>,
  scale: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M12 3v18M4 7h16M6 12l-2 5h4zM18 12l-2 5h4z"/></svg>,
  box:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>,
};

export default function Dashboard() {
  const { data: k, isLoading: kpiLoading } = useDashboardKpis();
  const { data: warehouses = [] } = useWarehouses();
  const { data: purchases = [] } = usePurchases();
  const { data: approvals = [] } = useApprovals();

  const pending = purchases.filter((p: any) => p.payment_status !== 'COMPLETED');

  return (
    <div className="space-y-10 max-w-[1400px]">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Warehouses" value={kpiLoading ? '...' : k?.total_warehouses ?? 0} hint="Across 4 districts" icon={Ico.store} tone="amber" delay={0}/>
        <KPICard label="Total Capacity"   value={kpiLoading ? '...' : fmtKg(k?.total_capacity_kg ?? 0)} icon={Ico.scale} tone="mid" delay={80}/>
        <KPICard label="Current Stock"    value={kpiLoading ? '...' : fmtKg(k?.total_stock_kg ?? 0)} hint="Live across all stores" icon={Ico.box} tone="pale" delay={160}/>
        <KPICard label="Overall Utilization" value={kpiLoading ? '...' : `${k?.utilization_pct ?? 0}%`} hint="Target < 80%" icon={Ico.chart} tone="dark" delay={240}/>
      </section>

      <section>
        <SectionHeader label="Assigned Warehouses" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {warehouses.length === 0 && (
            <div className="col-span-full text-center text-forest-800/50 text-sm py-8">Loading warehouses...</div>
          )}
          {warehouses.map((w: any,i: number) => <WarehouseCard key={w.warehouse_id} w={w} delay={i*80}/>)}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader label="Purchase Orders Awaiting Pickup" />
          {pending.length === 0 ? (
            <div className="rounded-2xl bg-white border border-forest-600/10 p-8 text-center text-sm text-forest-800/60 shadow-soft">No pending purchase orders.</div>
          ) : (
            <DataTable columns={['Purchase','Farmer','Paddy','Amount','Payment','Warehouse','']}>
              {pending.map((p: any) => (
                <TR key={p.purchase_id}>
                  <TD><span className="font-semibold text-forest-700">#{p.purchase_id}</span></TD>
                  <TD>{p.farmer_name}</TD>
                  <TD><span className="text-forest-800/80">{p.paddy_type}</span>
                      <div className="text-xs text-forest-800/50">{fmtKg(p.quantity_kg)}</div></TD>
                  <TD className="font-semibold">{fmtLKR(p.amount_lkr)}</TD>
                  <TD><StatusBadge status={p.payment_status}/></TD>
                  <TD className="text-xs text-forest-800/70">{p.warehouse_name}</TD>
                  <TD><Button variant="outline">Assign delivery</Button></TD>
                </TR>
              ))}
            </DataTable>
          )}
        </div>

        <div>
          <SectionHeader label="Recent Approvals" />
          <ul className="rounded-2xl bg-white border border-forest-600/10 shadow-soft divide-y divide-forest-600/5 animate-fade-up">
            {approvals.length === 0 && (
              <li className="p-8 text-center text-sm text-forest-800/60">No recent approvals.</li>
            )}
            {approvals.map((a: any, i: number) => (
              <li key={a.approval_id}
                  style={{animationDelay:`${i*80}ms`}}
                  className="p-4 flex gap-3 animate-slide-in hover:bg-forest-50/40 transition">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest-500 to-forest-700 text-cream text-xs font-semibold flex items-center justify-center shrink-0">
                  {a.officer_name?.split(' ').map((s:string)=>s[0]).slice(0,2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold text-forest-700">{a.officer_name}</span>{' '}
                    <span className="text-forest-800/70">{a.action?.toLowerCase()}</span>{' '}
                    <span className="font-medium text-forest-700">{a.entity_type?.toLowerCase()} #{a.entity_id}</span>
                  </div>
                  {a.note && <div className="text-xs text-forest-800/60 mt-0.5">{a.note}</div>}
                  <div className="text-[11px] text-forest-800/40 mt-1">{fmtDate(a.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
