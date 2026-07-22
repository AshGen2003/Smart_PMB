/**
 * Fake data shown across every admin-side page while Portal Preview is
 * active (see lib/dal.ts's `previewing` marker). Preview always renders
 * this instead of a real API response — never the real backend data — so
 * that letting an admin "see as" another role can never leak real farmer,
 * financial, or operational records. Kept in one place so every preview
 * page (dashboard, warehouses, pricing, approvals, reports) tells a single
 * consistent story with the same warehouse/paddy-type names throughout.
 */

export const PREVIEW_DISTRICTS = [
  { id: 1, name: "Anuradhapura", province: { name: "North Central" } },
  { id: 2, name: "Polonnaruwa", province: { name: "North Central" } },
  { id: 3, name: "Kurunegala", province: { name: "North Western" } },
];

export const PREVIEW_WAREHOUSES = [
  {
    id: 1,
    name: "Anuradhapura Central Store",
    code: "WH-DEMO-01",
    capacity: "400000.00",
    current_stock: "148000.00",
    status: "active" as const,
    contact_number: "011 000 0000",
    established_date: "2021-03-01",
    district: 1,
    district_name: "Anuradhapura",
    province: 1,
    province_name: "North Central",
    location: "Sample data",
  },
  {
    id: 2,
    name: "Polonnaruwa Storage Facility",
    code: "WH-DEMO-02",
    capacity: "300000.00",
    current_stock: "96000.00",
    status: "active" as const,
    contact_number: "011 000 0000",
    established_date: "2021-06-15",
    district: 2,
    district_name: "Polonnaruwa",
    province: 1,
    province_name: "North Central",
    location: "Sample data",
  },
  {
    id: 3,
    name: "Kurunegala Regional Store",
    code: "WH-DEMO-03",
    capacity: "250000.00",
    current_stock: "58000.00",
    status: "under_maintenance" as const,
    contact_number: "011 000 0000",
    established_date: "2022-01-10",
    district: 3,
    district_name: "Kurunegala",
    province: 2,
    province_name: "North Western",
    location: "Sample data",
  },
];

export const PREVIEW_PADDY_TYPES = [
  {
    id: 1,
    type_name: "Nadu",
    variety: "BG 352",
    description: "Sample data — not a real paddy type record.",
    guaranteed_price: "120.00",
    is_active: true,
  },
  {
    id: 2,
    type_name: "Samba",
    variety: "BG 379",
    description: "Sample data — not a real paddy type record.",
    guaranteed_price: "135.00",
    is_active: true,
  },
  {
    id: 3,
    type_name: "Keeri Samba",
    variety: "BW 367",
    description: "Sample data — not a real paddy type record.",
    guaranteed_price: "150.00",
    is_active: false,
  },
];

export const PREVIEW_FARMER_OPTIONS = [
  { id: 1, name: "Sample Farmer A", registration_no: "FRM-DEMO-001" },
  { id: 2, name: "Sample Farmer B", registration_no: "FRM-DEMO-002" },
];

export const PREVIEW_PADDY_TYPE_OPTIONS = PREVIEW_PADDY_TYPES.map((p) => ({
  id: p.id,
  type_name: p.type_name,
}));

export const PREVIEW_WAREHOUSE_OPTIONS = PREVIEW_WAREHOUSES.map((w) => ({
  id: w.id,
  name: w.name,
}));

export const PREVIEW_HARVESTS = [
  {
    id: 1,
    farmer: 1,
    farmer_name: "Sample Farmer A",
    paddy_type: 1,
    paddy_type_name: "Nadu",
    warehouse: 1,
    warehouse_name: "Anuradhapura Central Store",
    quantity_kg: "1200.00",
    harvest_date: "2026-07-01",
    purchase_date: "2026-07-03",
    grade: "A" as const,
    moisture_level: "13.50",
    quality_check: true,
    unit_price: "120.00",
    status: "collected" as const,
  },
  {
    id: 2,
    farmer: 2,
    farmer_name: "Sample Farmer B",
    paddy_type: 2,
    paddy_type_name: "Samba",
    warehouse: 2,
    warehouse_name: "Polonnaruwa Storage Facility",
    quantity_kg: "850.00",
    harvest_date: "2026-07-10",
    purchase_date: null,
    grade: null,
    moisture_level: null,
    quality_check: null,
    unit_price: null,
    status: "pending" as const,
  },
  {
    id: 3,
    farmer: 1,
    farmer_name: "Sample Farmer A",
    paddy_type: 1,
    paddy_type_name: "Nadu",
    warehouse: 1,
    warehouse_name: "Anuradhapura Central Store",
    quantity_kg: "600.00",
    harvest_date: "2026-07-15",
    purchase_date: "2026-07-16",
    grade: "B" as const,
    moisture_level: "14.20",
    quality_check: true,
    unit_price: "120.00",
    status: "verified" as const,
  },
];

export const PREVIEW_OFFICER_DASHBOARD = {
  kpis: {
    total_warehouses: PREVIEW_WAREHOUSES.length,
    total_stock: PREVIEW_WAREHOUSES.reduce((sum, w) => sum + Number(w.current_stock), 0),
    pending_approvals: PREVIEW_HARVESTS.filter((h) => h.status === "pending").length,
    active_paddy_types: PREVIEW_PADDY_TYPES.filter((p) => p.is_active).length,
  },
  recent_harvests: PREVIEW_HARVESTS.map((h) => ({
    id: h.id,
    farmer_name: h.farmer_name,
    paddy_type_name: h.paddy_type_name,
    warehouse_name: h.warehouse_name,
    quantity_kg: h.quantity_kg,
    status: h.status,
  })),
  warehouse_stock: PREVIEW_WAREHOUSES.map((w) => ({
    id: w.id,
    name: w.name,
    current_stock: w.current_stock,
    capacity: w.capacity,
  })),
  charts: {
    status_breakdown: [
      { status: "pending", label: "Pending", count: 1 },
      { status: "verified", label: "Verified", count: 1 },
      { status: "collected", label: "Collected", count: 1 },
      { status: "rejected", label: "Rejected", count: 0 },
    ],
    harvest_trend: [
      { period: "Week 1", quantity_kg: 900 },
      { period: "Week 2", quantity_kg: 1400 },
      { period: "Week 3", quantity_kg: 1100 },
      { period: "Week 4", quantity_kg: 1650 },
    ],
  },
};

export const PREVIEW_OFFICER_REPORTS = {
  stock_report: PREVIEW_WAREHOUSES.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    capacity: w.capacity,
    current_stock: w.current_stock,
    status: w.status,
    district_name: w.district_name,
  })),
  transaction_report: PREVIEW_HARVESTS.filter((h) => h.status === "collected").map((h) => ({
    id: h.id,
    purchase_date: h.purchase_date ?? h.harvest_date,
    farmer_name: h.farmer_name ?? "—",
    paddy_type: h.paddy_type_name,
    warehouse: h.warehouse_name,
    quantity_kg: h.quantity_kg,
    unit_price: h.unit_price,
    amount: h.unit_price ? String(Number(h.unit_price) * Number(h.quantity_kg)) : null,
    payment_status: "completed",
    status: h.status,
  })),
  charts: {
    grade_distribution: [
      { grade: "A", count: 1 },
      { grade: "B", count: 1 },
      { grade: "C", count: 0 },
    ],
    payment_status_breakdown: [
      { status: "pending", label: "Pending", count: 1 },
      { status: "completed", label: "Completed", count: 1 },
      { status: "failed", label: "Failed", count: 0 },
    ],
    monthly_purchases: [
      { period: "Apr", quantity_kg: 3200, amount: 384000 },
      { period: "May", quantity_kg: 4100, amount: 492000 },
      { period: "Jun", quantity_kg: 3800, amount: 456000 },
      { period: "Jul", quantity_kg: 2650, amount: 318000 },
    ],
  },
};
