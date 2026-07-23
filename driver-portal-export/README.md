# Driver Portal — code export

A reference/backup copy of the Smart PMB driver portal and everything it
depends on, pulled out of `Smart_pmb_frontend` on 2026-07-23. **This is not
a runnable standalone app** — see "What's missing" below. Original relative
paths are preserved under `frontend/` and `backend/` so any file here can be
dropped back into a full checkout at the same path.

## frontend/ (from `my-app/`)

- `app/driver/**` — the driver portal itself: dashboard, task accept/reject,
  live-location reporting, Vehicle Log (fuel/maintenance), Vehicle Details,
  messages/settings/profile pages.
- `app/api/driver/**` — the one client-side API proxy route the portal uses
  (location ping reporting).
- `app/actions/{driver,auth,profile,preview}.ts` — Server Actions the portal
  calls (task respond/status, login/logout, profile updates, exiting
  Portal Preview).
- `app/lib/{api,dal,previewSampleData,errors,jwt,session}.ts` — the shared
  auth/session/permission/API-fetch plumbing every page in the portal reads
  from (`getCurrentUser`, `requireRole`, `apiFetch`, JWT verification).
- `app/components/*` — every shared component the portal's pages import:
  `DriverShell`/`DriverSidebar` (layout + nav), `LocationMap` (the Google
  Maps live-tracking widget), `Header`/`NotificationBell`, `MessagesHistoryView`,
  `ProfileView`/`ProfilePictureUploader`, `SettingsSections`/`PasswordInput`,
  `PreviewBanner`, `LayoutProvider`, `ThemeProvider`, `IdleRefreshGuard` — plus
  their co-located `.module.css` files.
- `package.json` — included so the npm dependency versions (Next.js, React,
  lucide-react, jose, clsx, etc.) are documented, even though `node_modules`
  itself isn't included.

## backend/ (from `Smart_pmb_backend/pmb_bk/`)

The driver-related view/model/serializer code isn't split into its own
Django app — it lives interleaved with officer/admin code inside a handful
of shared files. Those files are copied **whole** rather than as
hand-extracted snippets, so nothing is missing a cross-reference:

- `farmers/models.py` — `Delivery`, `DeliveryLocationPing`, `Vehicle`,
  `Route`, `FuelRecord`, `MaintenanceRecord` (plus the other farmers-app
  models they reference, e.g. `Warehouse`).
- `farmers/serializers.py`, `farmers/views.py`, `farmers/permissions.py`
  (`IsDriver`, `CanViewVehicles`), `farmers/urls.py`.
- `farmers/migrations/0005`–`0012` — the migrations that build up the
  Vehicle/Delivery/DeliveryLocationPing schema, including the Driver→User
  account swap (`0006`–`0010`) and the vehicle model/size/year fields (`0012`).
- `accounts/models.py`, `accounts/permissions.py` — `User`/`Message` models
  and the `HasPermission`/`HasAnyPermission` classes `farmers/views.py`
  depends on.
- `pmb_bk/urls.py` — router registrations for the driver-facing endpoints.
- `requirements.txt` — Python package list (Django, DRF, reportlab, Pillow, etc.).

## What's NOT included (why this won't run standalone)

- `node_modules/`, `package-lock.json`, Next.js config (`next.config.ts`,
  `tsconfig.json`), global styles/theme tokens (`globals.css`), and every
  other route in the app (admin/farmer portals, auth pages) — the driver
  portal shares its layout chrome and design tokens with the rest of the
  Next.js app.
- The rest of the Django project: `settings.py`, `manage.py`, other apps
  (`sysops`), and every non-driver view/model in the files above (harvest
  approval, warehouse/pricing management, admin reports, etc.) still live
  in those same shared files.
- A database — the driver portal reads/writes real Postgres tables
  (`Delivery`, `Vehicle`, etc.) via the Django ORM; there's no data export
  here, just code.

In short: this folder is a **code reference/backup**, not something you can
`npm install && npm run dev` on its own. To actually run the driver portal,
copy the full `Smart_pmb_frontend` project instead.
