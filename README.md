# Smart PMB

Smart PMB is a digital platform for managing paddy purchasing, warehouse operations, farmer services, and analytics in Sri Lanka. It replaces manual, paper-based purchasing records with a role-based web system connecting farmers, PMB officers, and administrators.

## Features

- **Farmer portal** — self-registration (with email confirmation), harvest submission tracking, guaranteed paddy prices, payment status, and notifications.
- **PMB Officer tools** — warehouse management, paddy type/pricing management, harvest approvals (pending → verified → collected/rejected workflow with automatic payment records), and stock/transaction reports.
- **Admin dashboard** — user and role management with a custom RBAC (role/permission) system, system maintenance tools, audit/auth logs, and a downloadable governance report (PDF).
- **Live activity tracking** — a real-time "who's online" widget broken down by role.
- **Charts everywhere** — dashboards and reports are backed by real aggregation endpoints and rendered with Recharts, matching a consistent chart color palette in both light and dark themes.

## Tech stack

**Backend** — `Smart_pmb_backend/pmb_bk/`
- Django 6 + Django REST Framework
- JWT authentication (`djangorestframework_simplejwt`) with httpOnly cookies
- PostgreSQL (Supabase-hosted)
- ReportLab for PDF report generation (including native chart rendering)

**Frontend** — `my-app/`
- Next.js 16 (App Router, Turbopack)
- React 19
- Recharts for data visualization
- CSS Modules with a token-based light/dark theme system

## Project structure

```
Smart_pmb_backend/pmb_bk/   Django project
  accounts/                  Auth, users, roles, permissions
  farmers/                   Farmers, warehouses, paddy types, harvests, payments
  sysops/                    Audit logs, system config, backups, admin reports/PDF
  pmb_bk/                    Project settings, URLs, ASGI/WSGI entry points

my-app/                     Next.js frontend
  app/(auth)/                Login, farmer signup, email confirmation
  app/(admin)/               Admin/officer dashboard, users, roles, warehouses,
                              pricing, approvals, reports, settings
  app/farmer/                Farmer portal
  app/lib/                   Auth/JWT/session helpers, DAL (authorization gates)
  app/actions/                Server Actions (forms, mutations)
```

## Getting started

### Backend

```
cd Smart_pmb_backend/pmb_bk
python -m venv venv
venv\Scripts\activate        # or `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in `Smart_pmb_backend/pmb_bk/` with your database credentials:

```
DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USER=...
DB_PASSWORD=...
```

```
python manage.py migrate
python manage.py runserver
```

### Frontend

```
cd my-app
npm install
npm run dev
```

The frontend expects the Django backend to be running on `http://localhost:8000`.

## Roles & permissions

Access is controlled by a `Role` → `Permission` model rather than hardcoded role checks. Built-in roles include Admin, PMB Officer, Farmer, Warehouse Manager, Authorized Purchaser, Driver, Mill Owner, and Moderator — each granted whichever permissions (`manage_users`, `manage_warehouses`, `manage_pricing`, `record_purchases`, `monitor_operations`, `generate_reports`, `view_audit_logs`, `manage_system`, `manage_roles`) an admin assigns them.
