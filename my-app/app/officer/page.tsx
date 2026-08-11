/**
 * `/officer` — the PMB Officer portal's own dashboard (its "home", same
 * role root-page convention as `driver/page.tsx`/`farmer/page.tsx`).
 * Reuses the same OfficerDashboardPanel/GenericDashboard components as the
 * shared admin shell's `/dashboard` (see (admin)/dashboard/page.tsx),
 * fetching the same `/api/officer/dashboard/` endpoint — just without the
 * admin-panel branch, since only pmb_officer accounts ever reach this
 * portal (access is enforced by officer/layout.tsx's requirePermission
 * ("access_pmb_officer_portal")).
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import { PREVIEW_OFFICER_DASHBOARD } from "@/app/lib/previewSampleData";
import GenericDashboard from "@/app/(admin)/dashboard/GenericDashboard";
import OfficerDashboardPanel from "@/app/(admin)/dashboard/OfficerDashboardPanel";

export default async function OfficerDashboardPage() {
  const user = await getCurrentUser();

  // Portal Preview lands here too (see officer/layout.tsx's docstring) —
  // never fetch real data for it, same as (admin)/dashboard/page.tsx's
  // handling of previewing this exact panel.
  if (user?.previewing) {
    return (
      <OfficerDashboardPanel
        data={PREVIEW_OFFICER_DASHBOARD}
        enabledWidgets={user?.dashboardWidgets ?? []}
        basePath="/officer"
      />
    );
  }

  const res = await apiFetch("/api/officer/dashboard/");
  const data = res.ok ? await res.json() : null;

  if (!data) {
    return <GenericDashboard />;
  }

  return <OfficerDashboardPanel data={data} enabledWidgets={user?.dashboardWidgets ?? []} basePath="/officer" />;
}
