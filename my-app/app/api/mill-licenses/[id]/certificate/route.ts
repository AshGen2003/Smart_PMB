/**
 * Route Handler: GET /api/mill-licenses/[id]/certificate
 *
 * Authenticated proxy in front of Django's self-service mill operating-
 * license certificate PDF endpoint — the mill-owner-facing counterpart to
 * /api/licenses/[id]/certificate (the officer-side download). Django itself
 * scopes LicenseViewSet to the caller's own mill and 400s unless that
 * specific license is approved.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const res = await apiFetch(`/api/mill-owner/licenses/${id}/certificate/`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return new Response(data.detail ?? "Failed to generate certificate", { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="smart-pmb-mill-license-${id}.pdf"`,
    },
  });
}
