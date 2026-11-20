BEGIN;

-- =====================================================================
-- SPRINT 2: AUTH SESSION INACTIVITY TRACKING
-- =====================================================================
--
-- Domain:  AA04 (Secure Session Handling)
-- Basis:   Clarifications #29 (session duration & logout scope)
--          and #34 (token validity & refresh)
-- Purpose: Extend `auth_sessions` (created by 015) with `last_activity_at`
--          so that session validity can be evaluated as:
--            now < expires_at
--            AND
--            now - last_activity_at < SESSION_INACTIVITY_MINUTES
--
-- Idempotent: `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`.
-- Backfill: PostgreSQL 11+ backfills pre-existing rows with the DEFAULT
--          value (NOW()) when adding a NOT NULL column with a DEFAULT.
--          This gives in-flight sessions a fresh inactivity window from
--          migration time, which is acceptable for a Sprint 2 deploy.
--
-- Companion ADR: ADR-004 v2.2.
-- Companion tables: `auth_sessions` (015), `unauthorized_attempts` (016).
-- =====================================================================

ALTER TABLE auth_sessions
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for the inactivity sweep (cron / scheduled cleanup).
CREATE INDEX IF NOT EXISTS idx_auth_sessions_last_activity
    ON auth_sessions (last_activity_at);

-- Compound index for per-user session enumeration and cleanup
-- (logout-all-sessions is out of scope per Clarification #29, but
-- per-user admin queries and GDPR retention need this).
CREATE INDEX IF NOT EXISTS idx_auth_sessions_username_activity
    ON auth_sessions (username, last_activity_at DESC);

COMMIT;