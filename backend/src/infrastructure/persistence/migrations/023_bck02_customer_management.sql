BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_email_lower ON customers (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_email ON customers (email);

CREATE TABLE IF NOT EXISTS customer_dietary_restrictions (
	customer_email VARCHAR NOT NULL,
	allergen_name VARCHAR NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT pk_customer_dietary_restrictions PRIMARY KEY (customer_email, allergen_name),
	CONSTRAINT customer_dietary_restrictions_customer_email_fkey FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT fk_customer_dietary_allergen FOREIGN KEY (allergen_name) REFERENCES allergens(name) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_customer_dietary_allergen ON customer_dietary_restrictions (allergen_name);

COMMIT;
