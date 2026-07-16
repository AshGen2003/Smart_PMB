import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

// A thin authenticated proxy: the browser can't attach the httpOnly
// access_token cookie as a Bearer header itself, so this route does it
// server-side (via apiFetch) and streams the PDF back.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("manage_users")) {
    return new Response("Forbidden", { status: 403 });
  }

  const res = await apiFetch("/api/admin/reports/admin-summary/pdf/");
  if (!res.ok) {
    return new Response("Failed to generate report", { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pmb-admin-report.pdf"',
    },
  });
}
