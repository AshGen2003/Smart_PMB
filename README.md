<p align="center">
  <img src="my-app/public/logo.png" alt="Smart PMB logo" width="110" />
</p>

<h1 align="center">Smart PMB</h1>

<p align="center">
  A digital platform for paddy purchasing, warehouse operations, transportation, and farmer services in Sri Lanka.<br/>
  Replaces manual, paper-based purchasing records with a role-based web system connecting farmers, drivers, PMB officers, and administrators.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Django-6-092E20?logo=django&logoColor=white" alt="Django 6" />
  <img src="https://img.shields.io/badge/DRF-3.17-A30000?logo=django&logoColor=white" alt="Django REST Framework" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase&logoColor=white" alt="PostgreSQL / Supabase" />
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech stack</a> ·
  <a href="#project-structure">Project structure</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#roles--permissions">Roles &amp; permissions</a>
</p>

---

## Features

| Portal | Highlights |
| --- | --- |
| **Farmer** | Self-registration with email confirmation, harvest submission tracking, guaranteed paddy prices, payment status, notifications. |
| **Driver** | Delivery tasks with accept/reject workflow, live GPS tracking on Google Maps, a personal vehicle log for fuel/maintenance records. |
| **PMB Officer** | Warehouse management, paddy type/pricing management, the harvest approval workflow (pending → verified → collected/rejected, with automatic payment records), fleet/route/delivery management, and downloadable stock/transaction reports (PDF). |
| **Admin** | User and role management with a custom RBAC (role/permission) system, system maintenance tools, audit/auth logs, and a downloadable governance report (PDF). |

Plus, across every portal:

- **Live activity tracking** — a real-time "who's online" widget broken down by role.
- **Portal Preview** — admins can preview any role's view of the app using safe, sample data (never real records).
- **Charts everywhere** — dashboards and reports are backed by real aggregation endpoints and rendered with Recharts, matching a consistent chart color palette in both light and dark themes.

## Tech stack

<table>
<tr><td valign="top">

**Backend** — `Smart_pmb_backend/pmb_bk/`
- Django 6 + Django REST Framework
- JWT authentication (`djangorestframework_simplejwt`) with httpOnly cookies
- PostgreSQL (Supabase-hosted)
- ReportLab + Pillow for PDF report generation (native chart rendering, watermarking)

</td><td valign="top">

**Frontend** — `my-app/`
- Next.js 16 (App Router, Turbopack)
- React 19
- Recharts for data visualization
- Google Maps JavaScript API for live vehicle tracking
- CSS Modules with a token-based light/dark theme system

</td></tr>
</table>

## Project structure

```
Smart_pmb_backend/pmb_bk/    Django project
  accounts/                   Auth, users, roles, permissions
  farmers/                    Farmers, warehouses, paddy types, harvests,
                               payments, vehicles/routes/deliveries, reports
  sysops/                     Audit logs, system config, backups, admin reports/PDF
  pmb_bk/                     Project settings, URLs, ASGI/WSGI entry points

my-app/                      Next.js frontend
  app/(auth)/                  Login, farmer signup, email confirmation
  app/(admin)/                 Admin/officer dashboard, users, roles, warehouses,
                                pricing, approvals, transportation, reports, settings
  app/farmer/                  Farmer portal
  app/driver/                  Driver portal (tasks, live tracking, vehicle log)
  app/lib/                     Auth/JWT/session helpers, DAL (authorization gates)
  app/actions/                 Server Actions (forms, mutations)
```

## Getting started

### Backend

```bash
cd Smart_pmb_backend/pmb_bk
python -m venv venv
venv\Scripts\activate        # or `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in `Smart_pmb_backend/pmb_bk/` with your database credentials:

```env
DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USER=...
DB_PASSWORD=...
```

```bash
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd my-app
npm install
npm run dev
```

> The frontend expects the Django backend to be running on `http://localhost:8000`.

## Roles & permissions

Access is controlled by a `Role` → `Permission` model rather than hardcoded role checks — an admin can create new roles and grant any combination of permissions at any time.

| Role | Typical permissions |
| --- | --- |
| **Admin** | `manage_users`, `manage_roles` — full user/role governance, plus every other permission by default (superuser). |
| **PMB Officer** | `manage_warehouses`, `manage_pricing`, `record_purchases`, `monitor_operations`, `generate_reports`, `manage_transport` — day-to-day purchasing, warehouse, and fleet operations. |
| **Farmer** | none — self-service only (own harvests, payments, notifications). |
| **Driver** | none — self-service only (own delivery tasks, live location, vehicle log). |
| **Warehouse Manager · Authorized Purchaser · Mill Owner · Moderator** | Subsets of the officer permissions above, assignable per-role. |

<sub>Full permission list: `manage_users`, `manage_roles`, `view_audit_logs`, `export_data`, `monitor_operations`, `approve_licenses`, `manage_pricing`, `manage_warehouses`, `record_purchases`, `generate_reports`, `manage_system`, `manage_transport`.</sub>
