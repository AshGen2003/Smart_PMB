/**
 * The fixed catalog of widgets OfficerDashboardPanel.tsx can render, with
 * human labels for the "Officer Dashboard Widgets" checklist in
 * (admin)/roles/RoleFormModal.tsx. Keys must match the codenames Django's
 * Role.dashboard_widgets validates against (see accounts/constants.py's
 * OFFICER_DASHBOARD_WIDGETS — kept in sync manually, same as every other
 * codename string shared between the two codebases).
 */
export const DASHBOARD_WIDGET_OPTIONS = [
  { key: "kpi_total_warehouses", label: "Total Warehouses (KPI)" },
  { key: "kpi_total_stock", label: "Total Stock (KPI)" },
  { key: "kpi_pending_approvals", label: "Pending Approvals (KPI)" },
  { key: "kpi_active_paddy_types", label: "Active Paddy Types (KPI)" },
  { key: "chart_harvest_trend", label: "Harvest Volume Chart" },
  { key: "chart_status_breakdown", label: "Harvest Status Breakdown Chart" },
  { key: "chart_stock_by_warehouse", label: "Stock by Warehouse Chart" },
  { key: "table_recent_harvests", label: "Recent Harvests Table" },
  { key: "table_warehouse_stock", label: "Warehouse Stock Table" },
] as const;
