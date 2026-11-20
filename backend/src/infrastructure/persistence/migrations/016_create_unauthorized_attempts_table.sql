BEGIN;

-- One row for each authenticated request rejected with HTTP 403.
CREATE TABLE IF NOT EXISTS unauthorized_attempts (
    id BIGSERIAL PRIMARY KEY,
    "user" VARCHAR CONSTRAINT fk_unauthorized_attempts_user REFERENCES users(username) ON DELETE SET NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    endpoint TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_unauthorized_attempts_user_timestamp
    ON unauthorized_attempts("user", "timestamp");

COMMIT;
