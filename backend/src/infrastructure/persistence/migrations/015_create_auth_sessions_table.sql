BEGIN;

-- Per-login sessions shared by every API instance; JWTs carry the UUID as sid.
CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY,
    username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

COMMIT;
