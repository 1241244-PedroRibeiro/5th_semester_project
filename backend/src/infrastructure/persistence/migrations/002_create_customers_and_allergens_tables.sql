BEGIN;

CREATE TABLE IF NOT EXISTS allergens (
	name VARCHAR PRIMARY KEY,
	description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS customers (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	username VARCHAR UNIQUE REFERENCES users(username) ON DELETE SET NULL,
	first_name VARCHAR(75) NOT NULL CHECK (length(btrim(first_name)) > 0),
	last_name VARCHAR(75) NOT NULL CHECK (length(btrim(last_name)) > 0),
	phone VARCHAR NOT NULL,
	email VARCHAR NOT NULL,
	vat_number VARCHAR,
	marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
	consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
	street VARCHAR NOT NULL,
	postal_code VARCHAR NOT NULL,
	city VARCHAR NOT NULL,
	extra_details VARCHAR NOT NULL DEFAULT '',
	is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_dietary_restrictions (
	username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
	allergen_name VARCHAR NOT NULL REFERENCES allergens(name) ON DELETE RESTRICT,
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (username, allergen_name)
);

COMMIT;
