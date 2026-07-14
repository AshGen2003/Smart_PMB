# Smart PMB — Logistics Module

A full **Logistics Module** web application for the Smart Paddy Marketing Board
(PMB) digital ecosystem (Sri Lanka), built with:

- **Next.js 14** (App Router, TypeScript, Tailwind CSS) — `frontend/`
- **Django 5 + Django REST Framework** — `backend/`
- **Supabase Postgres** as the database (the Django ORM connects directly to
  your Supabase project; no separate DB server required)

The design uses the colour palette taken from the supplied collage: deep paddy
**greens** with a **harvest-gold** accent.

## Module scope

This repository implements only the **Logistics module** from the combined ER
diagram:

`Vehicle · Driver · Route · Delivery · FuelRecord · MaintenanceRecord · GpsTracking`

Cross-module references (Warehouse, PMB Officer, Purchase Intake) are modelled
as unmanaged relations so the module plugs into the wider Smart PMB system
without owning those tables.

## Repository layout

```
.
├── backend/     Django + DRF API (manages logistics tables in Supabase)
│   ├── smartpmb/        project settings, urls, wsgi/asgi
│   ├── logistics/       models, serializers, views, urls, admin, seed
│   ├── schema.sql       shared reference tables for local testing
│   └── requirements.txt
└── frontend/    Next.js app (dashboard + CRUD UI)
    ├── app/             routes (dashboard, vehicles, drivers, …)
    ├── components/      Sidebar, Topbar, CrudTable, EntityForm, …
    └── lib/             api client, auth context, types
```

## Run it

### 1. Backend (Django → Supabase)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # set DATABASE_URL to your Supabase URI
python manage.py migrate             # creates logistics tables in Supabase
python manage.py seed                # demo user + sample data
python manage.py runserver 8000
```

Get the Supabase connection string from **Supabase dashboard → Project
Settings → Database → Connection string → URI** and paste it into `DATABASE_URL`
(replace `YOUR_PASSWORD`). See `backend/README.md` for the full Supabase guide
(incl. RLS, SSL, and the shared reference tables).

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                          # http://localhost:3000
```

Sign in with **admin / Admin@1234** (admin) or **user / User@1234** (regular user).

## Screenshots / flows

- **Login** → token-based auth, stored in `localStorage`, sent as
  `Authorization: Token …`.
- **Dashboard** → live KPIs, charts, recent deliveries (calls `/api/dashboard/`).
- **CRUD pages** → create / edit / delete for every logistics entity, with
  dropdowns for relations (vehicle, driver, route, delivery) populated from the
  API.
