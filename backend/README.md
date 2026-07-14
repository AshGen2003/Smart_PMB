# Smart PMB — Logistics Module (Django + DRF API)

A Django + Django REST Framework backend for the **Logistics Module** of the
Smart Paddy Marketing Board (PMB) ecosystem. It runs directly on **Supabase
Postgres** as its database — no separate database server is required.

## What's included

| Entity (table)        | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `vehicle`             | Transport fleet (lorries, vans, tractors, …)             |
| `driver`              | Registered drivers and duty status                       |
| `route`               | Collection / distribution routes                         |
| `delivery`            | Scheduled paddy deliveries (links vehicle/driver/route)  |
| `fuel_record`         | Fuel consumption & cost per vehicle                      |
| `maintenance_record`  | Vehicle servicing & repairs                              |
| `gps_tracking`        | Location points logged for a delivery                    |

The logistics tables are **managed by Django migrations** and are created inside
your Supabase project. Cross-module references (`warehouse`, `pmb_officer`,
`purchase_intake`) are modelled as **unmanaged** models with
`db_constraint=False` foreign keys, so this module stays decoupled from the
other Smart PMB modules that own those tables.

## API endpoints

All endpoints live under `/api/` and require an auth token (DRF TokenAuth).

| Method | Endpoint                          | Notes                                |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/api/auth/token/`                | Obtain token: `{username, password}` |
| GET    | `/api/auth/me/`                   | Current user                         |
| GET    | `/api/dashboard/`                 | Aggregated analytics                 |
| GET/POST | `/api/vehicles/`                | List / create                        |
| GET/PUT/DELETE | `/api/vehicles/:id/`         | Retrieve / update / delete           |
| …      | `/api/drivers/`, `/api/routes/`, `/api/deliveries/`, `/api/fuel-records/`, `/api/maintenance-records/`, `/api/gps-tracking/` | Same CRUD shape |
| POST   | `/api/deliveries/:id/update_status/` | Patch a delivery's status        |

Filtering via query params, e.g.
`/api/deliveries/?delivery_status=in_transit`,
`/api/vehicles/?vehicle_type=lorry`.

---

## Supabase setup (the only database path)

### 1. Get your Supabase connection string
In the Supabase dashboard for your project:
**Project Settings → Database → Connection string → URI**.

It looks like:
```
postgresql://postgres:YOUR_PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres?sslmode=require
```
Copy it and replace `YOUR_PASSWORD` with your **database password**
(Project Settings → Database → your password).

### 2. Configure the backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
#   edit .env and set DATABASE_URL to the Supabase URI from step 1
```

### 3. Create the schema & seed
```bash
python manage.py migrate      # creates the logistics tables in Supabase
python manage.py seed         # demo user + sample data
python manage.py runserver 8000
```
The `seed` command prints the auth token and demo credentials
(**admin / Admin@1234** for admin, **user / User@1234** for a regular user).

> **Shared reference tables.** If `warehouse`, `pmb_officer`, and
> `purchase_intake` do not yet exist in your Supabase project (because the
> other Smart PMB modules haven't created them), apply
> [`../supabase/migrations/20240101000000_reference_tables.sql`](../supabase/migrations/20240101000000_reference_tables.sql)
> (Supabase CLI `supabase db push`, or paste into the SQL Editor). A copy also
> lives in [`schema.sql`](./schema.sql). The logistics tables themselves are
> always created by `migrate`.

### 4. Supabase notes that matter
- **SSL is required.** The connection string already ends with
  `?sslmode=require`; Django is also configured with `ssl_require=True`.
- **Row Level Security (RLS).** Django connects using the project's `postgres`
  role (the role behind the connection string), which **bypasses RLS**. So you
  do **not** need to write RLS policies for Django's reads/writes. RLS only
  applies to clients that connect with the `anon`/`authenticated` Supabase keys
  (e.g. a future direct-from-browser Supabase client) — which this app does
  not use, since the Next.js frontend talks to Django, not to Supabase
  directly.
- **Connection pooling.** For production, consider Supabase's connection
  pooler (port 6543, `?sslmode=require`) to avoid exhausting connections:
  `postgresql://postgres:...@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require`.

## Developing without Supabase credentials

If you don't have the Supabase database password (e.g. you joined the project
but aren't the owner), leave `DATABASE_URL` empty (or keep the
`CHANGE_THIS_DB_PASSWORD` placeholder) in `.env`. Django then falls back to a
local SQLite file so you can run the API and build the frontend locally:

```bash
python manage.py migrate
python manage.py seed
python manage.py runserver 8000
```

The owner (who has the credentials) runs the same commands with the real
`DATABASE_URL` to create the tables in Supabase.

## Working in a group project

- **Don't share the `postgres` superuser password.** Only the project owner
  (or people they add to the Supabase project) can view it.
- **Owner sets up the database:** run `migrate` + `seed` with the real
  `DATABASE_URL`, or apply `supabase/migrations/20240101000000_reference_tables.sql`
  via `supabase db push` / SQL Editor.
- **Contributors:** develop against local SQLite (above), or ask the owner to
  add you to the Supabase project so you can read the connection string from
  the dashboard. For the Django backend you can also use the **connection
  pooler** URL (`…pooler.supabase.com:6543`) to avoid exhausting connections.
- **Secrets stay out of git:** `.env` is gitignored; each member configures
  their own `DATABASE_URL` locally.

## Admin
`python manage.py runserver` then visit `/admin/` (create a superuser with
`python manage.py createsuperuser`). All logistics models are registered.

## Authentication

The API uses **Django Token authentication** (`/api/auth/token/`), not Supabase
Auth. This is intentional: Supabase is used purely as the **database**, and the
Next.js frontend authenticates against Django. Introducing Supabase Auth JWTs
would add a second, parallel auth system (verifying Supabase-issued JWTs in
Django, mapping Supabase users to Django users, securing anon/service roles)
without benefit for this module. If you later want SSO / magic-link login via
Supabase, that's a targeted, isolated enhancement we can add on top.
