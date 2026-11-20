BEGIN;

UPDATE customers SET email = LOWER(email) WHERE email <> LOWER(email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_email ON customers (email);

ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS customer_email VARCHAR;
UPDATE customer_addresses address SET customer_email = customer.email
FROM customers customer WHERE address.customer_id = customer.id AND address.customer_email IS NULL;
ALTER TABLE customer_addresses ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE customer_addresses DROP CONSTRAINT IF EXISTS customer_addresses_customer_id_fkey;
DROP INDEX IF EXISTS uq_customer_default_address;
ALTER TABLE customer_addresses DROP COLUMN IF EXISTS customer_id;
ALTER TABLE customer_addresses ADD CONSTRAINT customer_addresses_customer_email_fkey
	FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE CASCADE;
CREATE UNIQUE INDEX uq_customer_default_address ON customer_addresses (customer_email) WHERE is_default;

ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR;
UPDATE customer_orders order_record SET customer_email = customer.email
FROM customers customer WHERE order_record.customer_id = customer.id AND order_record.customer_email IS NULL;
ALTER TABLE customer_orders DROP CONSTRAINT IF EXISTS customer_orders_customer_id_fkey;
DROP INDEX IF EXISTS idx_orders_customer;
ALTER TABLE customer_orders DROP COLUMN IF EXISTS customer_id;
ALTER TABLE customer_orders ADD CONSTRAINT customer_orders_customer_email_fkey
	FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX idx_orders_customer ON customer_orders (customer_email);

ALTER TABLE customer_dietary_restrictions ADD COLUMN IF NOT EXISTS customer_email VARCHAR;
DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'customer_dietary_restrictions'
			AND column_name = 'customer_id'
	) THEN
		UPDATE customer_dietary_restrictions restriction SET customer_email = customer.email
		FROM customers customer WHERE restriction.customer_id = customer.id AND restriction.customer_email IS NULL;
		ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS pk_customer_dietary_restrictions;
		ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS fk_customer_dietary_customer;
		ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS customer_dietary_restrictions_customer_id_fkey;
		ALTER TABLE customer_dietary_restrictions DROP COLUMN customer_id;
		ALTER TABLE customer_dietary_restrictions ADD CONSTRAINT pk_customer_dietary_restrictions PRIMARY KEY (customer_email, allergen_name);
	END IF;
END
$migration$;
ALTER TABLE customer_dietary_restrictions ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS customer_dietary_restrictions_customer_email_fkey;
ALTER TABLE customer_dietary_restrictions ADD CONSTRAINT customer_dietary_restrictions_customer_email_fkey
	FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
