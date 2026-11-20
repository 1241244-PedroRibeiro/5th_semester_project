BEGIN;

CREATE TABLE IF NOT EXISTS roles_assignment (
	id BIGSERIAL PRIMARY KEY,
	assigned_from VARCHAR NOT NULL CONSTRAINT fk_roles_assignment_from REFERENCES users(username) ON DELETE RESTRICT,
	role VARCHAR NOT NULL CONSTRAINT fk_roles_assignment_role REFERENCES user_roles(name) ON DELETE RESTRICT,
	assigned_to VARCHAR NOT NULL,
	"timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_assignment_from_timestamp ON roles_assignment(assigned_from, "timestamp");
CREATE INDEX IF NOT EXISTS idx_roles_assignment_to_timestamp ON roles_assignment(assigned_to, "timestamp");

COMMIT;
