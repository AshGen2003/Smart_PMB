-- SMART PMB — Database migration: Indexes, constraints & audit_logs table
-- This file documents the schema enhancements applied through Django migrations.
-- Run after `python manage.py migrate` to ensure all indexes are in place.

-- ============================================================
-- 1. AUDIT LOGS TABLE (managed via Django AuditLog model)
-- ============================================================
-- The audit_logs table is created by Django migration 0001_initial in the audit app.
-- Columns: log_id (PK), user_id (FK), action, target_type, target_id, details (JSONB), created_at
-- Indexes:
--   - (user_id, created_at DESC)
--   - (created_at DESC)
--   - (target_type, target_id)

-- ============================================================
-- 2. B-TREE INDEXES ON HIGH-FREQUENCY QUERY COLUMNS
-- ============================================================

-- Warehouses: district + status composite index
CREATE INDEX IF NOT EXISTS idx_warehouses_district_status
  ON warehouses (district, status);

-- Warehouses: created_at DESC for recent listing
CREATE INDEX IF NOT EXISTS idx_warehouses_created_desc
  ON warehouses (created_at DESC);

-- Purchases: warehouse_id + created_at DESC for per-warehouse history
CREATE INDEX IF NOT EXISTS idx_purchases_warehouse_date
  ON purchases (warehouse_id, purchase_date DESC);

-- Purchases: payment_status for filtered queries
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status
  ON purchases (payment_status);

-- Audit logs: user_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
  ON audit_logs (user_id, created_at DESC);

-- Audit logs: created_at DESC for recent listing
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc
  ON audit_logs (created_at DESC);

-- ============================================================
-- 3. EXPRESSION INDEX ON WAREHOUSE UTILIZATION RATIO
-- ============================================================
-- Composite/expression index to speed up capacity alert queries
CREATE INDEX IF NOT EXISTS idx_warehouses_utilization
  ON warehouses (((current_stock_kg / capacity_kg)));

-- ============================================================
-- 4. CHECK CONSTRAINTS (enforced via Django model constraints)
-- ============================================================
-- warehouses: capacity_kg > 0
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS ck_warehouse_capacity_positive;
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouse_capacity_positive
  CHECK (capacity_kg > 0);

-- warehouses: current_stock_kg >= 0
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS ck_warehouse_stock_non_negative;
ALTER TABLE warehouses ADD CONSTRAINT ck_warehouse_stock_non_negative
  CHECK (current_stock_kg >= 0);

-- purchases: quantity_kg > 0
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS ck_purchase_quantity_positive;
ALTER TABLE purchases ADD CONSTRAINT ck_purchase_quantity_positive
  CHECK (quantity_kg > 0);

-- purchases: amount_lkr >= 0
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS ck_purchase_amount_non_negative;
ALTER TABLE purchases ADD CONSTRAINT ck_purchase_amount_non_negative
  CHECK (amount_lkr >= 0);

-- ============================================================
-- 5. FOREIGN KEY CONSTRAINTS WITH ON DELETE RESTRICT
-- ============================================================
-- These are enforced via Django model ForeignKey(on_delete=models.PROTECT)
-- purchases.warehouse_id → warehouses.warehouse_id (RESTRICT)
-- purchases.purchaser_id → users.id (RESTRICT)
-- deliveries.warehouse_id → warehouses.warehouse_id (RESTRICT)
-- deliveries.purchase_id → purchases.purchase_id (RESTRICT)
-- audit_logs.user_id → users.id (SET NULL)
-- inventory.warehouse_id → warehouses.warehouse_id (CASCADE)
