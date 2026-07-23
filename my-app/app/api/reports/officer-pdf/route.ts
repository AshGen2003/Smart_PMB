/**
 * Route Handler: GET /api/reports/officer-pdf
 *
 * Authenticated proxy in front of Django's officer report PDF endpoint —
 * mirrors /api/reports/admin-pdf exactly (see that file's docstring for why
 * a same-origin proxy is needed instead of linking straight to Django).
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("generate_reports")) {
    return new Response("Forbidden", { status: 403 });
  }

  const res = await apiFetch("/api/officer/reports/pdf/");
  if (!res.ok) {
    return new Response("Failed to generate report", { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pmb-officer-report.pdf"',
    },
  });
}
