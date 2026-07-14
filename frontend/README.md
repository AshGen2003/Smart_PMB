# Smart PMB — Logistics Module (Next.js frontend)

A Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend for the Smart
PMB Logistics Module. It talks to the Django + DRF API in `../backend`.

## Design language

Palette extracted from the project collage — **deep paddy greens** with a
**harvest-gold** accent (see `tailwind.config.ts`):

- Primary green scale `pmb-50 … pmb-900`
- Accent gold scale `gold-50 … gold-700`

## Getting started

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_BASE to the API URL
npm run dev                        # http://localhost:3000
```

Sign in with the API credentials (default demo user:
**logistics_admin / SmartPMB@2026**).

## Pages

- `/dashboard` — KPI cards, deliveries-by-status & fleet-status bar charts,
  cost summary, recent deliveries
- `/vehicles`, `/drivers`, `/routes` — fleet & network master data
- `/deliveries` — schedule deliveries, link vehicle/driver/route
- `/fuel`, `/maintenance` — operating cost tracking
- `/tracking` — GPS location points

All list pages are powered by a single generic `CrudTable` component
(`components/CrudTable.tsx`) with a dynamic `EntityForm`, so adding or tweaking
a field is a one-line config change.

## Environment

| Variable               | Default                  | Purpose                     |
| ---------------------- | ------------------------ | --------------------------- |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8000`  | Base URL of the Django API  |

## Build

```bash
npm run build && npm run start
```
