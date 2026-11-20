import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerBusinessKeyRelations1795300000000 implements MigrationInterface {
	name = 'CustomerBusinessKeyRelations1795300000000';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('UPDATE customers SET email = LOWER(email) WHERE email <> LOWER(email)');
		await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_email ON customers (email)');

		await queryRunner.query('ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS customer_email VARCHAR');
		await queryRunner.query(`UPDATE customer_addresses address SET customer_email = customer.email
			FROM customers customer WHERE address.customer_id = customer.id AND address.customer_email IS NULL`);
		await queryRunner.query('ALTER TABLE customer_addresses ALTER COLUMN customer_email SET NOT NULL');
		await queryRunner.query('ALTER TABLE customer_addresses DROP CONSTRAINT IF EXISTS customer_addresses_customer_id_fkey');
		await queryRunner.query('DROP INDEX IF EXISTS uq_customer_default_address');
		await queryRunner.query('ALTER TABLE customer_addresses DROP COLUMN IF EXISTS customer_id');
		await queryRunner.query(`ALTER TABLE customer_addresses ADD CONSTRAINT customer_addresses_customer_email_fkey
			FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE CASCADE`);
		await queryRunner.query('CREATE UNIQUE INDEX uq_customer_default_address ON customer_addresses (customer_email) WHERE is_default');

		await queryRunner.query('ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR');
		await queryRunner.query(`UPDATE customer_orders order_record SET customer_email = customer.email
			FROM customers customer WHERE order_record.customer_id = customer.id AND order_record.customer_email IS NULL`);
		await queryRunner.query('ALTER TABLE customer_orders DROP CONSTRAINT IF EXISTS customer_orders_customer_id_fkey');
		await queryRunner.query('DROP INDEX IF EXISTS idx_orders_customer');
		await queryRunner.query('ALTER TABLE customer_orders DROP COLUMN IF EXISTS customer_id');
		await queryRunner.query(`ALTER TABLE customer_orders ADD CONSTRAINT customer_orders_customer_email_fkey
			FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE RESTRICT`);
		await queryRunner.query('CREATE INDEX idx_orders_customer ON customer_orders (customer_email)');

		await queryRunner.query('ALTER TABLE customer_dietary_restrictions ADD COLUMN IF NOT EXISTS customer_email VARCHAR');
		if (await queryRunner.hasColumn('customer_dietary_restrictions', 'customer_id')) {
			await queryRunner.query(`UPDATE customer_dietary_restrictions restriction SET customer_email = customer.email
				FROM customers customer WHERE restriction.customer_id = customer.id AND restriction.customer_email IS NULL`);
			await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS pk_customer_dietary_restrictions');
			await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS fk_customer_dietary_customer');
			await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS customer_dietary_restrictions_customer_id_fkey');
			await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP COLUMN customer_id');
			await queryRunner.query('ALTER TABLE customer_dietary_restrictions ADD CONSTRAINT pk_customer_dietary_restrictions PRIMARY KEY (customer_email, allergen_name)');
		}
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions ALTER COLUMN customer_email SET NOT NULL');
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS customer_dietary_restrictions_customer_email_fkey');
		await queryRunner.query(`ALTER TABLE customer_dietary_restrictions ADD CONSTRAINT customer_dietary_restrictions_customer_email_fkey
			FOREIGN KEY (customer_email) REFERENCES customers(email) ON UPDATE CASCADE ON DELETE CASCADE`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions ADD COLUMN customer_id UUID');
		await queryRunner.query(`UPDATE customer_dietary_restrictions restriction SET customer_id = customer.id
			FROM customers customer WHERE restriction.customer_email = customer.email`);
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions ALTER COLUMN customer_id SET NOT NULL');
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS pk_customer_dietary_restrictions');
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP CONSTRAINT IF EXISTS customer_dietary_restrictions_customer_email_fkey');
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions DROP COLUMN customer_email');
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions ADD CONSTRAINT pk_customer_dietary_restrictions PRIMARY KEY (customer_id, allergen_name)');
		await queryRunner.query('ALTER TABLE customer_dietary_restrictions ADD CONSTRAINT fk_customer_dietary_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE');

		await queryRunner.query('ALTER TABLE customer_orders ADD COLUMN customer_id UUID');
		await queryRunner.query(`UPDATE customer_orders order_record SET customer_id = customer.id
			FROM customers customer WHERE order_record.customer_email = customer.email`);
		await queryRunner.query('ALTER TABLE customer_orders DROP CONSTRAINT IF EXISTS customer_orders_customer_email_fkey');
		await queryRunner.query('DROP INDEX IF EXISTS idx_orders_customer');
		await queryRunner.query('ALTER TABLE customer_orders DROP COLUMN customer_email');
		await queryRunner.query('ALTER TABLE customer_orders ADD CONSTRAINT customer_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT');
		await queryRunner.query('CREATE INDEX idx_orders_customer ON customer_orders (customer_id)');

		await queryRunner.query('ALTER TABLE customer_addresses ADD COLUMN customer_id UUID');
		await queryRunner.query(`UPDATE customer_addresses address SET customer_id = customer.id
			FROM customers customer WHERE address.customer_email = customer.email`);
		await queryRunner.query('ALTER TABLE customer_addresses ALTER COLUMN customer_id SET NOT NULL');
		await queryRunner.query('ALTER TABLE customer_addresses DROP CONSTRAINT IF EXISTS customer_addresses_customer_email_fkey');
		await queryRunner.query('DROP INDEX IF EXISTS uq_customer_default_address');
		await queryRunner.query('ALTER TABLE customer_addresses DROP COLUMN customer_email');
		await queryRunner.query('ALTER TABLE customer_addresses ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE');
		await queryRunner.query('CREATE UNIQUE INDEX uq_customer_default_address ON customer_addresses (customer_id) WHERE is_default');
		await queryRunner.query('DROP INDEX IF EXISTS uq_customers_email');
	}
}
