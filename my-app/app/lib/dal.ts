/**
 * Data Access Layer (DAL) for authentication and authorization.
 *
 * This is the main gate that protected Server Component pages call through
 * before rendering anything sensitive. Rather than sprinkling ad-hoc cookie
 * checks across pages, every protected route calls one of the `require*`
 * functions here, which either returns the authenticated user or redirects
 * away — so a page body can assume "if this line runs, the user is allowed
 * to be here."
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "./jwt";
import { apiFetch } from "./api";
import { IMPERSONATOR_ACCESS_COOKIE } from "./session";

// The application's view of "who is logged in", derived from the JWT
// payload. Kept separate from AccessTokenPayload (lib/jwt.ts) so callers
// work with friendly camelCase field names instead of the raw token shape.
export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  roleName: string;
  permissions: string[];
  // The rest of these come along for free from the same /api/auth/me/ call
  // this function already makes for live role/permissions (see below) —
  // every page that used to issue its own separate fetch for its profile
  // picture, nic/phone, or notification preferences now reads them straight
  // off this object instead, cutting a redundant network round-trip to the
  // (remote, Supabase-hosted) backend on every single page load.
  nic: string;
  phoneNumber: string;
  profilePictureUrl: string | null;
  notifyMessages: boolean;
  // null for any account with no farmer profile (that toggle has no
  // meaning for them) — see accounts/views.py's _notification_prefs.
  notifyHarvestUpdates: boolean | null;
  notifyViaSms: boolean | null;
  // True right after an admin creates or resets this account's password —
  // every portal layout redirects to /change-password until they set their
  // own (see accounts/views.py's AdminUserWriteSerializer).
  mustChangePassword: boolean;
  // null for every role except authorized_purchaser/mill_owner, which have
  // a LicenseApplication gating real access — see accounts/views.py's
  // _account_status and the partner/ route group's layout.
  licenseStatus: "pending" | "approved" | "rejected" | null;
  licenseRejectionReason: string;
  licenseBusinessName: string;
  licenseTypeDisplay: string;
  // Assigned only once licenseStatus is "approved" — see accounts.LicenseApplicationViewSet.approve.
  licenseNumber: string | null;
  // Set only while an admin is using Portal Preview (see
  // actions/preview.ts) — `role`/`roleName`/`permissions` above are already
  // swapped to the previewed role's when this is present, so every existing
  // page that reads those fields "just works" in preview without needing
  // its own preview-awareness. Real identity (id/email) is left untouched.
  previewing?: { slug: string; name: string };
  // Which of OfficerDashboardPanel.tsx's fixed widget catalog this user's
  // role has enabled (admin-configurable per role via /roles — see
  // accounts/models.py's Role.dashboard_widgets). Swapped to the previewed
  // role's list while Portal Preview is active, same as permissions above.
  dashboardWidgets: string[];
  // Set only while an admin is genuinely impersonating another user (see
  // actions/impersonation.ts) — unlike `previewing`, every field above
  // (id/email/role/permissions/...) reflects the REAL target user, since
  // this is a real session swap, not sample data layered on the admin's
  // own session. `email` here is the impersonating admin's own, so the
  // banner can say who's really at the controls.
  impersonating?: { email: string };
};

export const PREVIEW_COOKIE = "preview_role";

/**
 * If a Portal Preview cookie is set (and the real user is allowed to use
 * Portal Preview at all), fetches that role's current name/permissions from
 * Django. Returns `null` whenever preview isn't active or can't be resolved
 * (e.g. the cookie names a role that's since been deleted) — callers treat
 * that the same as "not previewing".
 */
const getPreviewRole = cache(
  async (): Promise<
    { slug: string; name: string; permissions: string[]; dashboard_widgets: string[] } | null
  > => {
    const cookieStore = await cookies();
    const slug = cookieStore.get(PREVIEW_COOKIE)?.value;
    if (!slug) return null;

    const res = await apiFetch("/api/admin/roles/");
    if (!res.ok) return null;
    const roles: { slug: string; name: string; permissions: string[]; dashboard_widgets: string[] }[] =
      await res.json();
    return roles.find((r) => r.slug === slug) ?? null;
  }
);

/**
 * If an impersonator-stash cookie is set (see actions/impersonation.ts),
 * decodes it locally (same verifyAccessToken used for the real session —
 * no network call) purely to read the impersonating admin's email for
 * display. Returns `null` when no impersonation is active.
 */
const getImpersonation = cache(async (): Promise<{ email: string } | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATOR_ACCESS_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { email: payload.email };
});

/**
 * Resolves the current request's authenticated user, or `null` if there is
 * no valid session.
 *
 * Wrapped in React's `cache()` so that multiple calls during the same
 * request/render (e.g. from a layout and several nested Server Components)
 * only verify the JWT once instead of repeating the crypto work — the
 * result is NOT cached across requests, just de-duplicated within one.
 *
 * Verifies the Django-issued JWT signature/expiry itself on every call
 * (via verifyAccessToken) rather than just trusting that a cookie is
 * present — a cookie could be expired, tampered with, or signed with an
 * old key, so presence alone isn't proof of a valid session.
 *
 * @returns The current AppUser, or `null` if there's no cookie or the
 *   token fails verification.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  // The JWT's own role/permissions claims are frozen at login time —
  // refreshing the access token just carries them forward unchanged
  // (simplejwt's stock TokenRefreshView, unmodified here), so if an admin
  // edits this user's role after they logged in (e.g. via the Preview
  // Portal's quick-toggle checklist), the token alone would keep granting
  // or denying access based on stale data for its whole lifetime.
  // /api/auth/me/ reads role+permissions fresh from the DB on every call —
  // the same thing Django's own request-time authorization already does
  // (see accounts/authentication.py) — so prefer that live value here too.
  // Falls back to the token's baked-in claim only if the request itself
  // fails (e.g. a transient network hiccup), rather than let a flaky
  // /me/ call sign everyone out.
  let role = payload.role;
  let roleName = payload.role_name;
  let realPermissions = payload.permissions ?? [];
  let dashboardWidgets: string[] = [];
  // Same staleness problem as role/permissions above — an admin editing
  // this user's email or name (via User Management, or the user's own
  // Settings) must show up without waiting for the access token to expire
  // and be re-issued at next login, so these come from the live /me/
  // response below too, not the frozen JWT claim.
  let email = payload.email;
  let fullName = payload.full_name || null;
  let nic = "";
  let phoneNumber = "";
  let profilePictureUrl: string | null = null;
  let notifyMessages = true;
  let notifyHarvestUpdates: boolean | null = null;
  let notifyViaSms: boolean | null = null;
  let mustChangePassword = false;
  let licenseStatus: "pending" | "approved" | "rejected" | null = null;
  let licenseRejectionReason = "";
  let licenseBusinessName = "";
  let licenseTypeDisplay = "";
  let licenseNumber: string | null = null;

  const meRes = await apiFetch("/api/auth/me/");
  // A 503 with this shape means sysops.middleware.MaintenanceModeMiddleware
  // blocked the request (maintenance_mode is on and this account isn't an
  // admin/superuser) — send them to a dedicated page rather than falling
  // through to the stale-JWT-claims fallback below, which would otherwise
  // silently render a dashboard with minutes-old permissions.
  if (meRes.status === 503) {
    const body: { maintenance?: boolean } = await meRes.json().catch(() => ({}));
    if (body.maintenance) {
      redirect("/maintenance-notice");
    }
  }
  if (meRes.ok) {
    const me: {
      email: string;
      full_name: string | null;
      role: string;
      role_name: string;
      permissions: string[];
      dashboard_widgets: string[];
      nic: string;
      phone_number: string;
      profile_picture: string | null;
      notify_in_app_messages: boolean;
      notify_harvest_updates: boolean | null;
      notify_via_sms: boolean | null;
      must_change_password: boolean;
      license_status: "pending" | "approved" | "rejected" | null;
      license_rejection_reason: string;
      license_business_name: string;
      license_type_display: string;
      license_number: string | null;
    } = await meRes.json();
    email = me.email;
    fullName = me.full_name || null;
    role = me.role;
    roleName = me.role_name;
    realPermissions = me.permissions ?? [];
    dashboardWidgets = me.dashboard_widgets ?? [];
    nic = me.nic ?? "";
    phoneNumber = me.phone_number ?? "";
    profilePictureUrl = me.profile_picture ?? null;
    notifyMessages = me.notify_in_app_messages ?? true;
    notifyHarvestUpdates = me.notify_harvest_updates ?? null;
    notifyViaSms = me.notify_via_sms ?? null;
    mustChangePassword = me.must_change_password ?? false;
    licenseStatus = me.license_status ?? null;
    licenseRejectionReason = me.license_rejection_reason ?? "";
    licenseBusinessName = me.license_business_name ?? "";
    licenseTypeDisplay = me.license_type_display ?? "";
    licenseNumber = me.license_number ?? null;
  }

  const user: AppUser = {
    id: payload.sub,
    email,
    fullName,
    role,
    roleName,
    permissions: realPermissions,
    dashboardWidgets,
    nic,
    phoneNumber,
    profilePictureUrl,
    notifyMessages,
    notifyHarvestUpdates,
    notifyViaSms,
    mustChangePassword,
    licenseStatus,
    licenseRejectionReason,
    licenseBusinessName,
    licenseTypeDisplay,
    licenseNumber,
  };

  // While impersonating, `user` above already reflects the REAL target
  // user (fetched live from /me/ using their own minted JWT) — no swapping
  // needed, just attach the marker so shells render the banner. Checked
  // before Portal Preview and skips it entirely: they're mutually
  // exclusive, and checking the target's own manage_roles below would be
  // meaningless here.
  const impersonation = await getImpersonation();
  if (impersonation) {
    return { ...user, impersonating: impersonation };
  }

  // Only holders of manage_roles can start a preview (see actions/preview.ts
  // enterPreview), so this re-checks that here too rather than trusting the
  // cookie alone — a permission change or role swap since the cookie was
  // set shouldn't silently keep granting preview powers.
  if (!realPermissions.includes("manage_roles")) return user;

  const previewRole = await getPreviewRole();
  if (!previewRole) return user;

  return {
    ...user,
    role: previewRole.slug,
    roleName: previewRole.name,
    permissions: previewRole.permissions,
    dashboardWidgets: previewRole.dashboard_widgets,
    previewing: { slug: previewRole.slug, name: previewRole.name },
  };
});

/**
 * Ensures a request has an authenticated user, redirecting to `/login` if
 * not. This is the base building block every other `require*` helper below
 * calls first — it guarantees "logged in" before those layer on "and has
 * this role/permission."
 *
 * @returns The authenticated AppUser. Never returns null — on failure it
 *   throws via `redirect()` (Next.js implements redirects by throwing a
 *   special error that the framework catches), so code after the call can
 *   assume a real user.
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Where to send a user who is logged in but not allowed on the page they
// requested — their own dashboard, rather than a generic error page. Also
// used directly by /change-password to know where to go once done.
export function homeFor(user: { role: string }): string {
  if (user.role === "farmer") return "/farmer";
  if (user.role === "driver") return "/driver";
  if (user.role === "warehouse_manager") return "/warehouse-manager";
  if (user.role === "pmb_officer") return "/officer";
  if (user.role === "mill_owner") return "/mill-owner";
  if (user.role === "authorized_purchaser") return "/purchaser";
  return "/dashboard";
}

/**
 * Ensures the current user is authenticated AND has the exact given role
 * (e.g. "farmer"). Logged-in users of the wrong role are bounced to their
 * own home page rather than shown the page they were denied.
 *
 * @param role The required role key, matched against `AppUser.role`.
 * @returns The authenticated, role-matching AppUser.
 */
export async function requireRole(role: string): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) {
    // Send them to their own home, not the page they were denied.
    redirect(homeFor(user));
  }
  return user;
}

/**
 * Ensures the current user is authenticated AND holds a specific
 * permission codename (as granted by their role — see actions/roles.ts).
 * This is the primary authorization check used by admin/officer pages,
 * e.g. `requirePermission("manage_users")`.
 *
 * @param codename Permission codename to check for, matching the strings
 *   returned in the JWT's `permissions` claim.
 * @returns The authenticated, authorized AppUser.
 */
export async function requirePermission(codename: string): Promise<AppUser> {
  const user = await requireUser();
  if (!user.permissions.includes(codename)) {
    redirect(homeFor(user));
  }
  return user;
}

/**
 * Like requirePermission, but passes if the user holds ANY one of several
 * permissions — useful for pages that multiple different roles should be
 * able to reach (e.g. a report viewable by either "view_reports" or
 * "manage_users" holders).
 *
 * @param codenames One or more permission codenames; the user needs at
 *   least one of them.
 * @returns The authenticated, authorized AppUser.
 */
export async function requireAnyPermission(...codenames: string[]): Promise<AppUser> {
  const user = await requireUser();
  if (!codenames.some((c) => user.permissions.includes(c))) {
    redirect(homeFor(user));
  }
  return user;
}

/**
 * Like requirePermission, but also passes for any "admin"-role account
 * regardless of their actual permission set — mirrors the backend's
 * RoleAccessPermission bypass (accounts/permissions.py). Intentionally
 * narrow: use this ONLY for the Roles page. It exists so that editing the
 * admin role's own permissions (even down to zero) can never lock every
 * admin out of the one screen that could undo it — every other permission
 * check in the app should keep using requirePermission/requireAnyPermission,
 * which respect whatever's actually configured on the role.
 */
export async function requirePermissionOrAdminRole(codename: string): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.includes(codename)) {
    redirect(homeFor(user));
  }
  return user;
}
