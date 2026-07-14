-- ===========================================================================
-- Smart PMB — Logistics Module : PostgreSQL schema (single-file)
-- ---------------------------------------------------------------------------
-- How to use in pgAdmin / PostgreSQL Workbench:
--   1) Create the database + role first (run setup_db.sql as the postgres
--      superuser), OR create a database named `smartpmb_db` in the UI.
--   2) Connect to `smartpmb_db` and run THIS file. It creates every table
--      the Django app expects (vehicle, driver, route, delivery, fuel_record,
--      maintenance_record, gps_tracking) plus the shared reference tables
--      (warehouse, pmb_officer, purchase_intake).
--   3) Tell Django the schema already exists, then load demo data:
--        python manage.py migrate --fake-initial
--        python manage.py seed
-- ===========================================================================

-- ---------------- Shared reference tables (owned by other modules) ----------
CREATE TABLE IF NOT EXISTS warehouse (
    warehouse_id               SERIAL PRIMARY KEY,
    name                       VARCHAR(150) NOT NULL,
    code                       VARCHAR(50) DEFAULT '',
    capacity                   NUMERIC(14, 2),
    current_stock              NUMERIC(14, 2),
    location                   VARCHAR(200) DEFAULT '',
    district                   VARCHAR(100) DEFAULT '',
    province                   VARCHAR(100) DEFAULT '',
    status                     VARCHAR(50) DEFAULT '',
    contact_number             VARCHAR(50) DEFAULT '',
    established_date           DATE,
    managed_by_pmb_officer_id  INTEGER
);

CREATE TABLE IF NOT EXISTS pmb_officer (
    pmb_officer_id   SERIAL PRIMARY KEY,
    employee_no      VARCHAR(50) DEFAULT '',
    name             VARCHAR(150) NOT NULL,
    nic              VARCHAR(20) DEFAULT '',
    role             VARCHAR(50) DEFAULT '',
    designation      VARCHAR(100) DEFAULT '',
    location         VARCHAR(200) DEFAULT '',
    district         VARCHAR(100) DEFAULT '',
    contact_number   VARCHAR(50) DEFAULT '',
    email            VARCHAR(150) DEFAULT '',
    joined_date      DATE,
    status           VARCHAR(50) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS purchase_intake (
    purchase_id      SERIAL PRIMARY KEY,
    purchase_number  VARCHAR(50) DEFAULT '',
    purchase_date    TIMESTAMP,
    paddy_type       VARCHAR(100) DEFAULT '',
    grade            VARCHAR(50) DEFAULT '',
    quantity         NUMERIC(14, 2),
    unit_price       NUMERIC(10, 2),
    total_price      NUMERIC(16, 2),
    payment_method   VARCHAR(50) DEFAULT '',
    payment_status   VARCHAR(50) DEFAULT '',
    moisture_level   NUMERIC(5, 2),
    quality_checked  BOOLEAN,
    farmer_id        INTEGER,
    purchaser_id     INTEGER,
    warehouse_id     INTEGER
);

-- ---------------- Logistics tables ------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle (
    vehicle_id      SERIAL PRIMARY KEY,
    registration_no VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type    VARCHAR(20) NOT NULL,
    capacity        INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS driver (
    driver_id    SERIAL PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    license_no   VARCHAR(30) NOT NULL UNIQUE,
    contact_no   VARCHAR(30) NOT NULL DEFAULT '',
    address      TEXT NOT NULL DEFAULT '',
    status       VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS route (
    route_id       SERIAL PRIMARY KEY,
    origin         VARCHAR(200) NOT NULL,
    destination    VARCHAR(200) NOT NULL,
    distance       DOUBLE PRECISION NOT NULL,
    estimated_time VARCHAR(50) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS delivery (
    delivery_id     SERIAL PRIMARY KEY,
    vehicle_id      INTEGER NOT NULL,
    driver_id       INTEGER NOT NULL,
    route_id        INTEGER NOT NULL,
    purchase        INTEGER,
    warehouse       INTEGER,
    approved_by     INTEGER,
    scheduled_date  DATE,
    delivery_status VARCHAR(20) NOT NULL,
    CONSTRAINT fk_delivery_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (vehicle_id),
    CONSTRAINT fk_delivery_driver  FOREIGN KEY (driver_id)  REFERENCES driver  (driver_id),
    CONSTRAINT fk_delivery_route   FOREIGN KEY (route_id)   REFERENCES route   (route_id)
);
CREATE INDEX IF NOT EXISTS idx_delivery_vehicle ON delivery (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_driver  ON delivery (driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_route   ON delivery (route_id);

CREATE TABLE IF NOT EXISTS fuel_record (
    fuel_id    SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    fuel_type  VARCHAR(20) NOT NULL,
    quantity   DOUBLE PRECISION NOT NULL,
    cost       DOUBLE PRECISION NOT NULL,
    fuel_date  DATE,
    CONSTRAINT fk_fuel_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (vehicle_id)
);
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_record (vehicle_id);

CREATE TABLE IF NOT EXISTS maintenance_record (
    maintenance_id     SERIAL PRIMARY KEY,
    vehicle_id         INTEGER NOT NULL,
    service_date       DATE,
    description        VARCHAR(255) NOT NULL DEFAULT '',
    cost               DOUBLE PRECISION NOT NULL DEFAULT 0,
    next_service_date  DATE,
    CONSTRAINT fk_maint_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (vehicle_id)
);
CREATE INDEX IF NOT EXISTS idx_maint_vehicle ON maintenance_record (vehicle_id);

CREATE TABLE IF NOT EXISTS gps_tracking (
    tracking_id  SERIAL PRIMARY KEY,
    delivery_id  INTEGER NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    timestamp    TIMESTAMP,
    CONSTRAINT fk_gps_delivery FOREIGN KEY (delivery_id) REFERENCES delivery (delivery_id)
);
CREATE INDEX IF NOT EXISTS idx_gps_delivery ON gps_tracking (delivery_id);
