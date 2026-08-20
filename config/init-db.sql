-- ============================================================
-- Database Initialization Script
-- Executed automatically on first container start via
-- docker-entrypoint-initdb.d
--
-- Creates isolated schemas for each module in the monolith.
-- Each module owns its own schema — no cross-schema SQL allowed.
-- ============================================================

-- Health module doesn't need its own schema (no persistent data).

-- User module schema
CREATE SCHEMA IF NOT EXISTS user_module;

-- Notification module schema (future persistent event store)
CREATE SCHEMA IF NOT EXISTS notification_module;

-- Authorization module schema
CREATE SCHEMA IF NOT EXISTS authorization_module;

-- Grant usage to the application user
GRANT USAGE ON SCHEMA user_module TO appuser;
GRANT USAGE ON SCHEMA notification_module TO appuser;
GRANT USAGE ON SCHEMA authorization_module TO appuser;
GRANT CREATE ON SCHEMA user_module TO appuser;
GRANT CREATE ON SCHEMA notification_module TO appuser;
GRANT CREATE ON SCHEMA authorization_module TO appuser;

-- Ensure the default search_path includes public for SequelizeMeta
ALTER ROLE appuser SET search_path TO public, user_module, notification_module, authorization_module;
