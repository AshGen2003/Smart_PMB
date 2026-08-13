/**
 * Route Handler: GET /api/licenses/[id]/certificate
 *
 * Authenticated proxy in front of Django's officer-side digital license
 * certificate PDF endpoint — mirrors /api/reports/officer-pdf exactly (see
 * that file's docstring for why a same-origin proxy is needed instead of
 * linking straight to Django).
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("approve_licenses")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const res = await apiFetch(`/api/admin/license-applications/${id}/certificate/`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return new Response(data.detail ?? "Failed to generate certificate", { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      // Forward Django's own filename (embeds the license number), falling
      // back to a generic one only if it's somehow missing.
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="smart-pmb-license-${id}.pdf"`,
    },
  });
}
