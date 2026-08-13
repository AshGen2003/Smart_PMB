/**
 * Route Handler: GET /api/licenses/certificate
 *
 * Authenticated proxy in front of Django's self-service digital license
 * certificate PDF endpoint — the applicant-facing counterpart to
 * /api/licenses/[id]/certificate (the officer-side download). Any logged-in
 * user can hit this; Django itself scopes it to the caller's own approved
 * LicenseApplication and 400s otherwise.
 */
import { getCurrentUser } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Forbidden", { status: 403 });
  }

  const res = await apiFetch("/api/auth/license-application/certificate/");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return new Response(data.detail ?? "Failed to generate certificate", { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? 'attachment; filename="smart-pmb-license.pdf"',
    },
  });
}
