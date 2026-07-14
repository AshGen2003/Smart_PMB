-- ===========================================================================
-- Smart PMB — local PostgreSQL database setup
-- Run this as the postgres SUPERUSER, e.g.:
--     psql -U postgres -f setup_db.sql
-- (or paste it into pgAdmin's query tool while connected as postgres)
--
-- It creates a dedicated application role + database for the Logistics app.
-- Do NOT use the postgres superuser for the Django connection.
-- ===========================================================================

-- Dedicated app role (password chosen without URL-special chars on purpose)
CREATE ROLE smartpmb IF NOT EXISTS LOGIN PASSWORD 'SmartPMB2026';

-- Project database owned by that role
CREATE DATABASE smartpmb_db WITH OWNER = smartpmb;

-- Privileges
GRANT ALL PRIVILEGES ON DATABASE smartpmb_db TO smartpmb;
