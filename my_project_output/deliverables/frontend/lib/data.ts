// Mock API layer. Swap fetch base URL to the Express API in production.
// Keeps the frontend runnable without a live backend for demo/dev.
export type Warehouse = {
  warehouse_id: number;
  name: string;
  district: string;
  location: string;
  capacity_kg: number;
  current_stock_kg: number;
  status: 'ACTIVE'|'MAINTENANCE'|'INACTIVE';
  utilization_pct: number;
};
export type Purchase = {
  purchase_id: number;
  farmer_name: string;
  paddy_type: string;
  quantity_kg: number;
  amount_lkr: number;
  payment_status: 'PENDING'|'COMPLETED'|'FAILED';
  warehouse_name: string;
  warehouse_id: number;
  purchase_date: string;
};
export type InventoryRow = {
  inventory_id: number; paddy_type: string; quantity_kg: number; storage_date: string;
};
export type Approval = {
  approval_id: number; officer_name: string; entity_type: string;
  entity_id: number; action: string; note?: string; created_at: string;
};

export const warehouses: Warehouse[] = [
  { warehouse_id:1, name:'Polonnaruwa Central Store', district:'Polonnaruwa', location:'Kaduruwela Rd',
    capacity_kg:500000, current_stock_kg:432000, status:'ACTIVE', utilization_pct:86.4 },
  { warehouse_id:2, name:'Anuradhapura Depot',       district:'Anuradhapura',location:'Mihintale Junction',
    capacity_kg:350000, current_stock_kg:128000, status:'ACTIVE', utilization_pct:36.6 },
  { warehouse_id:3, name:'Ampara Grain Silo',        district:'Ampara',      location:'Uhana Rd',
    capacity_kg:600000, current_stock_kg:540000, status:'ACTIVE', utilization_pct:90.0 },
  { warehouse_id:4, name:'Hambantota Coastal Store', district:'Hambantota',  location:'Tangalle Rd',
    capacity_kg:250000, current_stock_kg:42000,  status:'MAINTENANCE', utilization_pct:16.8 },
];

export const purchases: Purchase[] = [
  { purchase_id:1041, farmer_name:'Sunil Rathnayake',   paddy_type:'Nadu',
    quantity_kg:4200, amount_lkr:546000, payment_status:'PENDING',
    warehouse_name:'Polonnaruwa Central Store', warehouse_id:1, purchase_date:'2026-07-01T09:20:00Z' },
  { purchase_id:1042, farmer_name:'Ranjith Bandara',    paddy_type:'Samba',
    quantity_kg:3100, amount_lkr:434000, payment_status:'PENDING',
    warehouse_name:'Anuradhapura Depot',        warehouse_id:2, purchase_date:'2026-07-02T11:00:00Z' },
  { purchase_id:1043, farmer_name:'Anura Weerasinghe',  paddy_type:'Keeri Samba',
    quantity_kg:2800, amount_lkr:448000, payment_status:'COMPLETED',
    warehouse_name:'Ampara Grain Silo',         warehouse_id:3, purchase_date:'2026-07-02T14:35:00Z' },
  { purchase_id:1044, farmer_name:'Sunil Rathnayake',   paddy_type:'Red Raw',
    quantity_kg:1900, amount_lkr:228000, payment_status:'PENDING',
    warehouse_name:'Polonnaruwa Central Store', warehouse_id:1, purchase_date:'2026-07-03T08:10:00Z' },
  { purchase_id:1045, farmer_name:'Ranjith Bandara',    paddy_type:'Nadu',
    quantity_kg:5000, amount_lkr:650000, payment_status:'FAILED',
    warehouse_name:'Hambantota Coastal Store',  warehouse_id:4, purchase_date:'2026-07-03T10:45:00Z' },
];

export const inventoryByWarehouse: Record<number, InventoryRow[]> = {
  1: [
    { inventory_id:1, paddy_type:'Nadu',        quantity_kg:180000, storage_date:'2026-06-01' },
    { inventory_id:2, paddy_type:'Samba',       quantity_kg:142000, storage_date:'2026-06-10' },
    { inventory_id:3, paddy_type:'Keeri Samba', quantity_kg:110000, storage_date:'2026-06-20' },
  ],
  2: [
    { inventory_id:4, paddy_type:'Nadu',    quantity_kg:78000, storage_date:'2026-06-14' },
    { inventory_id:5, paddy_type:'Red Raw', quantity_kg:50000, storage_date:'2026-06-22' },
  ],
  3: [
    { inventory_id:6, paddy_type:'Samba', quantity_kg:320000, storage_date:'2026-05-30' },
    { inventory_id:7, paddy_type:'Nadu',  quantity_kg:220000, storage_date:'2026-06-11' },
  ],
  4: [
    { inventory_id:8, paddy_type:'Keeri Samba', quantity_kg:42000, storage_date:'2026-06-25' },
  ],
};

export const approvals: Approval[] = [
  { approval_id:1, officer_name:'Nimal Perera',  entity_type:'PURCHASE',  entity_id:1043, action:'APPROVED', note:'Payment cleared',            created_at:'2026-07-03T10:12:00Z' },
  { approval_id:2, officer_name:'Nimal Perera',  entity_type:'WAREHOUSE', entity_id:2,    action:'APPROVED', note:'Capacity upgrade signed off',created_at:'2026-07-03T08:44:00Z' },
  { approval_id:3, officer_name:'Nimal Perera',  entity_type:'DELIVERY',  entity_id:1,    action:'APPROVED', note:'Vehicle WP-LC-4521 assigned',created_at:'2026-07-02T17:20:00Z' },
];

export function kpis() {
  const total = warehouses.length;
  const capacity = warehouses.reduce((s,w)=>s+w.capacity_kg,0);
  const stock = warehouses.reduce((s,w)=>s+w.current_stock_kg,0);
  const util = capacity ? +((stock/capacity)*100).toFixed(1) : 0;
  return { total, capacity, stock, util };
}
export function capacityAlerts() {
  return warehouses
    .map(w => {
      const pct = w.utilization_pct;
      if (pct >= 85) return { w, level:'high' as const,
        msg:`${w.name} is at ${pct}% capacity — arrange dispatch soon.` };
      if (pct <= 20) return { w, level:'low' as const,
        msg:`${w.name} is only ${pct}% utilised — consider redirecting intake.` };
      return null;
    })
    .filter(Boolean) as { w:Warehouse; level:'high'|'low'; msg:string }[];
}
