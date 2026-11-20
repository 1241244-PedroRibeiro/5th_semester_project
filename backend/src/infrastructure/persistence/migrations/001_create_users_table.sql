-- Fresh schema: natural user identity and normalized role assignments.
BEGIN;

CREATE TABLE IF NOT EXISTS users (
	username VARCHAR PRIMARY KEY,
	first_name VARCHAR(75) NOT NULL CHECK (length(btrim(first_name)) > 0),
	last_name VARCHAR(75) NOT NULL CHECK (length(btrim(last_name)) > 0),
	email VARCHAR NOT NULL UNIQUE,
	password_hash VARCHAR NOT NULL,
	street VARCHAR,
	postal_code VARCHAR,
	city VARCHAR,
	extra_details VARCHAR,
	phone_number VARCHAR,
	status VARCHAR NOT NULL DEFAULT 'ACTIVE'
		CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
	name VARCHAR PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
	username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
	role_name VARCHAR NOT NULL REFERENCES user_roles(name) ON DELETE RESTRICT,
	PRIMARY KEY (username, role_name)
);

COMMIT;
