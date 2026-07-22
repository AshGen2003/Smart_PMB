-- =====================================================================
-- SMART PMB — Warehouse & Stock Management Module
-- PostgreSQL schema + seed data
-- =====================================================================
-- Assumes a shared `users` table already exists (auth module) with:
--   users(id UUID PK, name TEXT, email TEXT, role TEXT)
-- Roles used here: 'PMB_OFFICER', 'AUTHORIZED_PURCHASER', 'FARMER'
-- =====================================================================

BEGIN;

-- Shared users table stub (only if not already created by auth module)
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role         TEXT NOT NULL CHECK (role IN ('PMB_OFFICER','AUTHORIZED_PURCHASER','FARMER')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Warehouse
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
  warehouse_id   SERIAL PRIMARY KEY,
  name           TEXT   NOT NULL,
  district       TEXT   NOT NULL,
  location       TEXT   NOT NULL,
  capacity_kg    NUMERIC(14,2) NOT NULL CHECK (capacity_kg > 0),
  current_stock_kg NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_stock_kg >= 0),
  status         TEXT NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE','MAINTENANCE','INACTIVE')),
  manager_id     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (current_stock_kg <= capacity_kg)
);

-- ---------------------------------------------------------------------
-- Inventory — one row per stock batch inside a warehouse
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id SERIAL PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  paddy_type   TEXT NOT NULL,                  -- e.g. Nadu, Samba, Keeri Samba, Red Raw
  quantity_kg  NUMERIC(14,2) NOT NULL CHECK (quantity_kg >= 0),
  storage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);

-- ---------------------------------------------------------------------
-- Purchase — recorded when PMB buys paddy from a farmer/buyer
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  purchase_id    SERIAL PRIMARY KEY,
  farmer_id      UUID NOT NULL REFERENCES users(id),
  purchaser_id   UUID REFERENCES users(id),   -- AUTHORIZED_PURCHASER who logged it
  warehouse_id   INT  NOT NULL REFERENCES warehouses(warehouse_id),
  paddy_type     TEXT NOT NULL,
  quantity_kg    NUMERIC(14,2) NOT NULL CHECK (quantity_kg > 0),
  amount_lkr     NUMERIC(14,2) NOT NULL CHECK (amount_lkr >= 0),
  payment_status TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (payment_status IN ('PENDING','COMPLETED','FAILED')),
  purchase_date  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);

-- ---------------------------------------------------------------------
-- Vehicle & Route
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id     SERIAL PRIMARY KEY,
  vehicle_number TEXT UNIQUE NOT NULL,
  driver_name    TEXT NOT NULL,
  capacity_kg    NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
  route_id       SERIAL PRIMARY KEY,
  distance_km    NUMERIC(8,2) NOT NULL,
  estimated_time_min INT NOT NULL
);

-- ---------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliveries (
  delivery_id     SERIAL PRIMARY KEY,
  purchase_id     INT REFERENCES purchases(purchase_id),
  warehouse_id    INT NOT NULL REFERENCES warehouses(warehouse_id),
  vehicle_id      INT REFERENCES vehicles(vehicle_id),
  route_id        INT REFERENCES routes(route_id),
  pickup_location TEXT NOT NULL,
  drop_location   TEXT NOT NULL,
  delivery_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'SCHEDULED'
                  CHECK (status IN ('SCHEDULED','IN_TRANSIT','DELIVERED','CANCELLED'))
);

-- ---------------------------------------------------------------------
-- Approvals audit log (feeds the "Recent Approvals" widget)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
  approval_id  SERIAL PRIMARY KEY,
  officer_id   UUID NOT NULL REFERENCES users(id),
  entity_type  TEXT NOT NULL,   -- 'PURCHASE' | 'WAREHOUSE' | 'DELIVERY'
  entity_id    INT  NOT NULL,
  action       TEXT NOT NULL,   -- 'APPROVED' | 'REJECTED'
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;

-- =====================================================================
-- SEED DATA
-- =====================================================================
BEGIN;

INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('11111111-1111-1111-1111-111111111111','Nimal Perera','nimal@pmb.lk','x','PMB_OFFICER'),
  ('22222222-2222-2222-2222-222222222222','Kamal Silva','kamal@pmb.lk','x','AUTHORIZED_PURCHASER'),
  ('33333333-3333-3333-3333-333333333333','Sunil Farmer','sunil@farm.lk','x','FARMER'),
  ('44444444-4444-4444-4444-444444444444','Ranjith Farmer','ranjith@farm.lk','x','FARMER'),
  ('55555555-5555-5555-5555-555555555555','Anura Farmer','anura@farm.lk','x','FARMER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouses (name, district, location, capacity_kg, current_stock_kg, status, manager_id) VALUES
  ('Polonnaruwa Central Store',  'Polonnaruwa', 'Kaduruwela Rd',       500000, 432000, 'ACTIVE',
   '11111111-1111-1111-1111-111111111111'),
  ('Anuradhapura Depot',         'Anuradhapura','Mihintale Junction',  350000, 128000, 'ACTIVE',
   '11111111-1111-1111-1111-111111111111'),
  ('Ampara Grain Silo',          'Ampara',      'Uhana Rd',            600000, 540000, 'ACTIVE',
   '11111111-1111-1111-1111-111111111111'),
  ('Hambantota Coastal Store',   'Hambantota',  'Tangalle Rd',         250000, 42000,  'MAINTENANCE',
   '11111111-1111-1111-1111-111111111111');

INSERT INTO inventory (warehouse_id, paddy_type, quantity_kg, storage_date) VALUES
  (1,'Nadu',        180000,'2026-06-01'),
  (1,'Samba',       142000,'2026-06-10'),
  (1,'Keeri Samba', 110000,'2026-06-20'),
  (2,'Nadu',         78000,'2026-06-14'),
  (2,'Red Raw',      50000,'2026-06-22'),
  (3,'Samba',       320000,'2026-05-30'),
  (3,'Nadu',        220000,'2026-06-11'),
  (4,'Keeri Samba',  42000,'2026-06-25');

INSERT INTO purchases (farmer_id, purchaser_id, warehouse_id, paddy_type, quantity_kg, amount_lkr, payment_status) VALUES
  ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',1,'Nadu',        4200, 546000,'PENDING'),
  ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222',2,'Samba',       3100, 434000,'PENDING'),
  ('55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222',3,'Keeri Samba', 2800, 448000,'COMPLETED'),
  ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222',1,'Red Raw',     1900, 228000,'PENDING'),
  ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222',4,'Nadu',        5000, 650000,'FAILED');

INSERT INTO vehicles (vehicle_number, driver_name, capacity_kg) VALUES
  ('WP-LC-4521','Sarath Bandara',  8000),
  ('NC-PA-1180','Rohan Wickrama', 12000),
  ('EP-AG-7742','Mahinda Peris',   6000);

INSERT INTO routes (distance_km, estimated_time_min) VALUES
  (48.5,  75),
  (112.0,180),
  (65.0, 110);

INSERT INTO approvals (officer_id, entity_type, entity_id, action, note) VALUES
  ('11111111-1111-1111-1111-111111111111','PURCHASE',3,'APPROVED','Payment cleared'),
  ('11111111-1111-1111-1111-111111111111','WAREHOUSE',2,'APPROVED','Capacity upgrade signed off'),
  ('11111111-1111-1111-1111-111111111111','DELIVERY',1,'APPROVED','Vehicle assigned');

COMMIT;
