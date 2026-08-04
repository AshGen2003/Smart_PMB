/**
 * `/farmer` — the farmer portal's home dashboard: harvest/earnings KPIs,
 * current guaranteed paddy prices, notifications, and recent harvest
 * history. Farmer-only (access is enforced by app/farmer/layout.tsx).
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import FarmerDashboardView, { type DashboardPayload } from "./FarmerDashboardView";

// Shown instead of a real API call while an admin is using Portal Preview:
// the admin's own account has no Farmer profile row, so the real
// /api/farmer/dashboard/ request would always 404 — this keeps the preview
// showing a representative farmer dashboard instead of an error state.
const SAMPLE_FARMER_DASHBOARD: DashboardPayload = {
  farmer: {
    registration_no: "FRM-2026-000000",
    land_size: "3.5",
    status: "active",
    district: "Colombo",
    province: "Western",
    reliability_score: 82,
  },
  kpis: { total_harvests: 8, pending_payments: 1, total_earnings: 154200 },
  paddy_types: [
    { id: 1, type_name: "Nadu", variety: "Long grain", guaranteed_price: "115.00" },
    { id: 2, type_name: "Samba", variety: "Short grain", guaranteed_price: "128.00" },
  ],
  harvests: [
    { id: 1, paddy_type_name: "Nadu", quantity_kg: "620.00", harvest_date: "2026-07-10", status: "collected" },
    { id: 2, paddy_type_name: "Samba", quantity_kg: "480.00", harvest_date: "2026-07-17", status: "verified" },
    { id: 3, paddy_type_name: "Nadu", quantity_kg: "300.00", harvest_date: "2026-07-21", status: "pending" },
  ],
  notifications: [
    { id: 1, message: "This is sample data — Portal Preview shows what a farmer sees, not a real account.", sent_at: new Date().toISOString(), is_read: false },
  ],
  charts: {
    status_breakdown: [
      { status: "pending", label: "Pending", count: 1 },
      { status: "verified", label: "Verified", count: 1 },
      { status: "collected", label: "Collected", count: 6 },
      { status: "rejected", label: "Rejected", count: 0 },
    ],
    harvest_trend: [
      { period: "Jun 22", quantity_kg: 540 },
      { period: "Jun 29", quantity_kg: 610 },
      { period: "Jul 06", quantity_kg: 480 },
      { period: "Jul 13", quantity_kg: 700 },
      { period: "Jul 20", quantity_kg: 620 },
    ],
  },
};

/**
 * Server Component: fetches the farmer's dashboard payload (KPIs, paddy
 * prices, notifications, harvests) in one request and hands it to the
 * Client Component that actually renders it (FarmerDashboardView — needs
 * useLanguage() for translations, so it can't be a Server Component).
 * Shows a fallback message if the request fails — e.g. the account exists
 * but its farmer profile record hasn't been created/linked yet.
 */
export default async function FarmerDashboardPage() {
  const user = await getCurrentUser();

  let data: DashboardPayload | null;
  if (user?.previewing) {
    data = SAMPLE_FARMER_DASHBOARD;
  } else {
    const res = await apiFetch("/api/farmer/dashboard/");
    data = res.ok ? ((await res.json()) as DashboardPayload) : null;
  }

  return (
    <FarmerDashboardView
      data={data}
      userFullName={user?.fullName ?? null}
      previewing={!!user?.previewing}
    />
  );
}
