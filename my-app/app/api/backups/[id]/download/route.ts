/**
 * Route Handler: GET /api/backups/[id]/download
 *
 * Authenticated proxy in front of Django's backup-download endpoint —
 * mirrors /api/reports/officer-pdf/route.ts's proxy pattern (a same-origin
 * proxy is needed since the browser can't attach the httpOnly auth cookie
 * to a direct link to the Django backend).
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.permissions.includes("manage_system")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const res = await apiFetch(`/api/admin/backups/${id}/download/`);
  if (!res.ok) {
    return new Response("Failed to download backup", { status: res.status });
  }

  const contentDisposition = res.headers.get("Content-Disposition") ?? "attachment";
  const file = await res.arrayBuffer();
  return new Response(file, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": contentDisposition,
    },
  });
}
