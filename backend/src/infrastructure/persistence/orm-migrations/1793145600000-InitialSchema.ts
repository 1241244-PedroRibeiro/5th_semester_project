import { MigrationInterface, QueryRunner } from 'typeorm';
import { INITIAL_VIEWS } from '../initial-views';

/** Exact schema baseline plus required role names; PostgreSQL views, functions and deferred triggers require DDL. */
export class InitialSchema1793145600000 implements MigrationInterface {
	name = 'InitialSchema1793145600000';

	async up(queryRunner: QueryRunner): Promise<void> {
		for (const table of ['users', 'user_roles', 'user_role_assignments', 'allergens', 'customers', 'customer_addresses', 'user_dietary_restrictions', 'product_categories', 'pizza_sizes', 'pizza_component_types', 'products', 'product_allergens', 'component_size_configurations', 'predefined_pizzas', 'predefined_pizza_recipes', 'stock_items', 'stock_movements', 'customer_orders', 'order_items', 'personalized_pizza_snapshots', 'pizza_snapshot_components', 'pizza_snapshot_allergens', 'kitchen_resources', 'preparation_activities', 'activity_dependencies', 'predefined_pizza_available_sizes']) {
			if (await queryRunner.hasTable(table)) throw new Error('Existing application tables detected. Validate the schema and explicitly baseline with migration:baseline; do not replay the initial migration.');
		}
		// Historical schema: 001_create_users_table.sql
		await queryRunner.query(`-- Fresh schema: natural user identity and normalized role assignments.

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
);`);
		// Historical schema: 002_create_customers_and_allergens_tables.sql
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS allergens (
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
);`);
		// Historical schema: 003_create_catalogues_and_products_tables.sql
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS product_categories (
	name VARCHAR PRIMARY KEY,
	description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pizza_sizes (
	name VARCHAR PRIMARY KEY,
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pizza_component_types (
	name VARCHAR PRIMARY KEY,
	assembly_order INT NOT NULL UNIQUE CHECK (assembly_order > 0),
	min_cardinality INT NOT NULL DEFAULT 0 CHECK (min_cardinality >= 0),
	max_cardinality INT CHECK (max_cardinality IS NULL OR max_cardinality >= min_cardinality)
);

CREATE TABLE IF NOT EXISTS products (
	sku VARCHAR PRIMARY KEY,
	name VARCHAR NOT NULL UNIQUE,
	description TEXT NOT NULL,
	category_name VARCHAR NOT NULL REFERENCES product_categories(name) ON DELETE RESTRICT,
	is_sellable BOOLEAN NOT NULL DEFAULT FALSE,
	is_pizza_component BOOLEAN NOT NULL DEFAULT FALSE,
	is_stock_controlled BOOLEAN NOT NULL DEFAULT FALSE,
	component_type_name VARCHAR REFERENCES pizza_component_types(name) ON DELETE RESTRICT,
	direct_selling_price NUMERIC CHECK (direct_selling_price >= 0),
	direct_price_currency VARCHAR,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	CONSTRAINT direct_price_pair CHECK ((direct_selling_price IS NULL) = (direct_price_currency IS NULL))
);

CREATE TABLE IF NOT EXISTS product_allergens (
	product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
	allergen_name VARCHAR NOT NULL REFERENCES allergens(name) ON DELETE RESTRICT,
	PRIMARY KEY (product_sku, allergen_name)
);`);
		// Historical schema: 004_create_configurations_and_recipes_tables.sql
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS component_size_configurations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
	pizza_size VARCHAR NOT NULL REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
	price NUMERIC NOT NULL CHECK (price >= 0),
	price_currency VARCHAR NOT NULL,
	stock_units_consumed INT NOT NULL CHECK (stock_units_consumed >= 0),
	CONSTRAINT uq_product_size UNIQUE (product_sku, pizza_size)
);

-- SKU uniqueness is explicit in the supplied ERD, in addition to the composite PK.
-- It permits one predefined size variant per product and allows SKU-only recipe FKs.
CREATE TABLE IF NOT EXISTS predefined_pizzas (
	sku VARCHAR NOT NULL UNIQUE REFERENCES products(sku) ON DELETE RESTRICT,
	pizza_size VARCHAR NOT NULL REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
	recipe_name VARCHAR NOT NULL,
	PRIMARY KEY (sku, pizza_size)
);

CREATE TABLE IF NOT EXISTS predefined_pizza_recipes (
	pizza_sku VARCHAR NOT NULL REFERENCES predefined_pizzas(sku) ON DELETE CASCADE,
	component_product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
	default_quantity INT NOT NULL CHECK (default_quantity > 0),
	PRIMARY KEY (pizza_sku, component_product_sku)
);`);
		// Historical schema: 005_create_stock_tables.sql
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS stock_items (
	product_sku VARCHAR PRIMARY KEY REFERENCES products(sku) ON DELETE RESTRICT,
	current_units INT NOT NULL DEFAULT 0 CHECK (current_units >= 0),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	product_sku VARCHAR NOT NULL REFERENCES stock_items(product_sku) ON DELETE RESTRICT,
	type VARCHAR NOT NULL CHECK (type IN ('REPLENISHMENT', 'CONSUMPTION', 'ADJUSTMENT')),
	amount INT NOT NULL CHECK (amount >= 0),
	reason TEXT NOT NULL,
	recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
		// Historical schema: 006_create_views.sql
		await queryRunner.query(`CREATE OR REPLACE VIEW v_catalogue_products AS
SELECT
	p.sku,
	p.name,
	p.description,
	p.category_name,
	p.direct_selling_price,
	p.direct_price_currency,
	p.is_sellable,
	p.is_pizza_component,
	p.is_active,
	COALESCE(
		json_agg(json_build_object('name', a.name) ORDER BY a.name)
			FILTER (WHERE a.name IS NOT NULL),
		'[]'::json
	) AS allergens
FROM products p
LEFT JOIN product_allergens pa ON pa.product_sku = p.sku
LEFT JOIN allergens a ON a.name = pa.allergen_name
WHERE p.is_sellable
GROUP BY p.sku;

CREATE OR REPLACE VIEW v_predefined_pizza_details AS
SELECT
	p.sku AS pizza_sku,
	p.name AS pizza_name,
	p.description,
	p.category_name,
	s.name AS pizza_size,
	SUM(config.price * r.default_quantity) AS calculated_price,
	MIN(config.price_currency) AS price_currency,
	BOOL_AND(
		component.is_active AND component.is_pizza_component
		AND (NOT component.is_stock_controlled
			OR COALESCE(stock.current_units, 0) >= config.stock_units_consumed * r.default_quantity)
	) AS is_available_in_size
FROM predefined_pizzas pp
JOIN products p ON p.sku = pp.sku
JOIN pizza_sizes s ON s.name = pp.pizza_size
JOIN predefined_pizza_recipes r ON r.pizza_sku = pp.sku
JOIN products component ON component.sku = r.component_product_sku
LEFT JOIN component_size_configurations config
	ON config.product_sku = component.sku AND config.pizza_size = pp.pizza_size
LEFT JOIN stock_items stock ON stock.product_sku = component.sku
WHERE p.is_active AND s.is_active
GROUP BY p.sku, s.name
-- Never expose a partial total or add amounts in different currencies.
HAVING COUNT(config.id) = COUNT(*) AND COUNT(DISTINCT config.price_currency) = 1;`);
		// Historical schema: 008_create_orders_and_snapshots.sql
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS customer_orders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
	order_placement_time TIMESTAMPTZ NOT NULL,
	status VARCHAR NOT NULL CHECK (status IN ('SIMULATED', 'PLACED', 'CONFIRMED', 'IN_PREPARATION', 'READY', 'DELIVERED', 'CANCELLED')),
	total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
	currency VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
	line_number INT NOT NULL CHECK (line_number > 0),
	item_type VARCHAR NOT NULL CHECK (item_type IN ('STANDARD_PRODUCT', 'PERSONALIZED_PIZZA')),
	catalogue_product_sku VARCHAR REFERENCES products(sku) ON DELETE RESTRICT,
	quantity INT NOT NULL CHECK (quantity > 0),
	unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
	currency VARCHAR NOT NULL,
	fulfillment_status VARCHAR NOT NULL CHECK (fulfillment_status IN ('WAITING_PREPARATION', 'BEING_PREPARED', 'READY_TO_SERVE', 'SERVED')),
	UNIQUE (order_id, line_number)
);

CREATE TABLE IF NOT EXISTS personalized_pizza_snapshots (
	order_item_id UUID PRIMARY KEY REFERENCES order_items(id) ON DELETE CASCADE,
	source_predefined_pizza_sku VARCHAR REFERENCES predefined_pizzas(sku) ON DELETE RESTRICT,
	chosen_pizza_size VARCHAR NOT NULL REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
	computed_price NUMERIC NOT NULL CHECK (computed_price >= 0),
	currency VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS pizza_snapshot_components (
	order_item_id UUID NOT NULL REFERENCES personalized_pizza_snapshots(order_item_id) ON DELETE CASCADE,
	component_product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
	quantity INT NOT NULL CHECK (quantity > 0),
	PRIMARY KEY (order_item_id, component_product_sku)
);

CREATE TABLE IF NOT EXISTS pizza_snapshot_allergens (
	order_item_id UUID NOT NULL REFERENCES personalized_pizza_snapshots(order_item_id) ON DELETE CASCADE,
	allergen_name VARCHAR NOT NULL REFERENCES allergens(name) ON DELETE RESTRICT,
	PRIMARY KEY (order_item_id, allergen_name)
);`);
		// Historical schema: 009_create_kitchen_tables.sql
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS kitchen_resources (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR NOT NULL,
	resource_type VARCHAR NOT NULL,
	capacity_slots INT NOT NULL CHECK (capacity_slots >= 0),
	operational BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS preparation_activities (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	order_id UUID NOT NULL REFERENCES customer_orders(id) ON DELETE RESTRICT,
	order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
	activity_type VARCHAR NOT NULL,
	expected_duration_seconds INT NOT NULL CHECK (expected_duration_seconds >= 0),
	status VARCHAR NOT NULL CHECK (status IN ('WAITING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
	allocated_resource_id UUID REFERENCES kitchen_resources(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS activity_dependencies (
	activity_id UUID NOT NULL REFERENCES preparation_activities(id) ON DELETE CASCADE,
	depends_on_activity_id UUID NOT NULL REFERENCES preparation_activities(id) ON DELETE RESTRICT,
	PRIMARY KEY (activity_id, depends_on_activity_id)
);`);
		// Historical schema: 010_create_indexes.sql
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_name ON users (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON user_role_assignments (role_name);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_default_address ON customer_addresses (customer_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_user_dietary_allergen ON user_dietary_restrictions (allergen_name);
CREATE INDEX IF NOT EXISTS idx_products_name_lower ON products (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_name);
CREATE INDEX IF NOT EXISTS idx_products_component_type ON products (component_type_name);
CREATE INDEX IF NOT EXISTS idx_product_allergens_allergen ON product_allergens (allergen_name);
CREATE INDEX IF NOT EXISTS idx_stock_items_units ON stock_items (current_units);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod_date ON stock_movements (product_sku, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_configurations_size ON component_size_configurations (pizza_size);
CREATE INDEX IF NOT EXISTS idx_pizza_recipes_component ON predefined_pizza_recipes (component_product_sku);
CREATE INDEX IF NOT EXISTS idx_predefined_pizzas_size ON predefined_pizzas (pizza_size);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON customer_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (catalogue_product_sku);
CREATE INDEX IF NOT EXISTS idx_snapshot_components_product ON pizza_snapshot_components (component_product_sku);
CREATE INDEX IF NOT EXISTS idx_snapshot_allergens_allergen ON pizza_snapshot_allergens (allergen_name);
CREATE INDEX IF NOT EXISTS idx_preparation_activities_order ON preparation_activities (order_id, order_item_id);
CREATE INDEX IF NOT EXISTS idx_preparation_activities_resource ON preparation_activities (allocated_resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_dependencies_prerequisite ON activity_dependencies (depends_on_activity_id);`);
		// Historical schema: 011_aggregate_multiplicity.sql
		await queryRunner.query(`-- Deferred checks implement the four 1..* compositions shown in the ERD.
-- Insert/update a root and its required children in the same transaction.

CREATE OR REPLACE FUNCTION enforce_minimum_owned_children() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
	parent_table TEXT := TG_ARGV[0];
	parent_key TEXT := TG_ARGV[1];
	child_table TEXT := TG_ARGV[2];
	child_key TEXT := TG_ARGV[3];
	identity_value TEXT;
	missing_children BOOLEAN;
BEGIN
	IF TG_TABLE_NAME = parent_table THEN
		identity_value := to_jsonb(NEW) ->> parent_key;
	ELSE
		identity_value := to_jsonb(OLD) ->> child_key;
	END IF;

	EXECUTE format(
		'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text = $1) '
		|| 'AND NOT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text = $1)',
		TG_TABLE_SCHEMA, parent_table, parent_key, TG_TABLE_SCHEMA, child_table, child_key
	) INTO missing_children USING identity_value;

	IF missing_children THEN
		RAISE EXCEPTION '% must retain at least one % row', parent_table, child_table
			USING ERRCODE = '23514';
	END IF;
	RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS users_require_roles ON users;
CREATE CONSTRAINT TRIGGER users_require_roles AFTER INSERT OR UPDATE ON users
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('users', 'username', 'user_role_assignments', 'username');
DROP TRIGGER IF EXISTS role_assignments_preserve_user_roles ON user_role_assignments;
CREATE CONSTRAINT TRIGGER role_assignments_preserve_user_roles AFTER DELETE OR UPDATE ON user_role_assignments
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('users', 'username', 'user_role_assignments', 'username');

DROP TRIGGER IF EXISTS predefined_pizzas_require_recipe ON predefined_pizzas;
CREATE CONSTRAINT TRIGGER predefined_pizzas_require_recipe AFTER INSERT OR UPDATE ON predefined_pizzas
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('predefined_pizzas', 'sku', 'predefined_pizza_recipes', 'pizza_sku');
DROP TRIGGER IF EXISTS recipes_preserve_pizza_recipe ON predefined_pizza_recipes;
CREATE CONSTRAINT TRIGGER recipes_preserve_pizza_recipe AFTER DELETE OR UPDATE ON predefined_pizza_recipes
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('predefined_pizzas', 'sku', 'predefined_pizza_recipes', 'pizza_sku');

DROP TRIGGER IF EXISTS customer_orders_require_items ON customer_orders;
CREATE CONSTRAINT TRIGGER customer_orders_require_items AFTER INSERT OR UPDATE ON customer_orders
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('customer_orders', 'id', 'order_items', 'order_id');
DROP TRIGGER IF EXISTS items_preserve_order_items ON order_items;
CREATE CONSTRAINT TRIGGER items_preserve_order_items AFTER DELETE OR UPDATE ON order_items
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('customer_orders', 'id', 'order_items', 'order_id');

DROP TRIGGER IF EXISTS snapshots_require_components ON personalized_pizza_snapshots;
CREATE CONSTRAINT TRIGGER snapshots_require_components AFTER INSERT OR UPDATE ON personalized_pizza_snapshots
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('personalized_pizza_snapshots', 'order_item_id', 'pizza_snapshot_components', 'order_item_id');
DROP TRIGGER IF EXISTS components_preserve_snapshot_components ON pizza_snapshot_components;
CREATE CONSTRAINT TRIGGER components_preserve_snapshot_components AFTER DELETE OR UPDATE ON pizza_snapshot_components
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION
	enforce_minimum_owned_children('personalized_pizza_snapshots', 'order_item_id', 'pizza_snapshot_components', 'order_item_id');`);
		// Historical schema: 012_predefined_pizza_multiple_sizes.sql
		await queryRunner.query(`-- Preserve the size variants before changing the predefined pizza identity.
DROP VIEW IF EXISTS v_predefined_pizza_details;

CREATE TEMP TABLE _predefined_pizza_available_sizes
ON COMMIT DROP AS
SELECT
    sku AS pizza_sku,
    pizza_size
FROM predefined_pizzas;

-- Remove foreign keys that depend on the old unique SKU constraint.
ALTER TABLE predefined_pizza_recipes
    DROP CONSTRAINT IF EXISTS predefined_pizza_recipes_pizza_sku_fkey;

ALTER TABLE personalized_pizza_snapshots
    DROP CONSTRAINT IF EXISTS personalized_pizza_snapshots_source_predefined_pizza_sku_fkey;

DROP INDEX IF EXISTS idx_predefined_pizzas_size;

-- A predefined pizza is a product with one default recipe.
-- Sizes are represented separately.
ALTER TABLE predefined_pizzas
    DROP CONSTRAINT IF EXISTS predefined_pizzas_pkey;

ALTER TABLE predefined_pizzas
    DROP CONSTRAINT IF EXISTS predefined_pizzas_sku_key;

ALTER TABLE predefined_pizzas
    DROP COLUMN pizza_size;

ALTER TABLE predefined_pizzas
    ADD CONSTRAINT predefined_pizzas_pkey PRIMARY KEY (sku);

CREATE TABLE predefined_pizza_available_sizes (
    pizza_sku VARCHAR NOT NULL
        REFERENCES predefined_pizzas(sku) ON DELETE CASCADE,
    pizza_size VARCHAR NOT NULL
        REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
    PRIMARY KEY (pizza_sku, pizza_size)
);

-- Preserve the sizes that were previously stored on predefined_pizzas.
INSERT INTO predefined_pizza_available_sizes (pizza_sku, pizza_size)
SELECT pizza_sku, pizza_size
FROM _predefined_pizza_available_sizes
ON CONFLICT DO NOTHING;

-- Restore the recipe and snapshot relationships to the new pizza identity.
ALTER TABLE predefined_pizza_recipes
    ADD CONSTRAINT predefined_pizza_recipes_pizza_sku_fkey
    FOREIGN KEY (pizza_sku)
    REFERENCES predefined_pizzas(sku) ON DELETE CASCADE;

ALTER TABLE personalized_pizza_snapshots
    ADD CONSTRAINT personalized_pizza_snapshots_source_predefined_pizza_sku_fkey
    FOREIGN KEY (source_predefined_pizza_sku)
    REFERENCES predefined_pizzas(sku) ON DELETE RESTRICT;

CREATE INDEX idx_predefined_pizza_available_sizes_size
    ON predefined_pizza_available_sizes(pizza_size);

-- Rebuild the read view around the separate size association.
CREATE OR REPLACE VIEW v_predefined_pizza_details AS
SELECT
    p.sku AS pizza_sku,
    p.name AS pizza_name,
    p.description,
    p.category_name,
    s.name AS pizza_size,
    SUM(config.price * r.default_quantity) AS calculated_price,
    MIN(config.price_currency) AS price_currency,
    BOOL_AND(
        component.is_active
        AND component.is_pizza_component
        AND (
            NOT component.is_stock_controlled
            OR COALESCE(stock.current_units, 0)
                >= config.stock_units_consumed * r.default_quantity
        )
    ) AS is_available_in_size
FROM predefined_pizzas pp
JOIN products p ON p.sku = pp.sku
JOIN predefined_pizza_available_sizes available_size
    ON available_size.pizza_sku = pp.sku
JOIN pizza_sizes s ON s.name = available_size.pizza_size
JOIN predefined_pizza_recipes r ON r.pizza_sku = pp.sku
JOIN products component ON component.sku = r.component_product_sku
LEFT JOIN component_size_configurations config
    ON config.product_sku = component.sku
    AND config.pizza_size = available_size.pizza_size
LEFT JOIN stock_items stock ON stock.product_sku = component.sku
WHERE p.is_active AND s.is_active
GROUP BY p.sku, s.name
HAVING
    COUNT(config.id) = COUNT(*)
    AND COUNT(DISTINCT config.price_currency) = 1;`);
		// Historical schema: 013_user_contact_details.sql
		await queryRunner.query(`ALTER TABLE users
	ADD COLUMN IF NOT EXISTS street VARCHAR,
	ADD COLUMN IF NOT EXISTS postal_code VARCHAR,
	ADD COLUMN IF NOT EXISTS city VARCHAR,
	ADD COLUMN IF NOT EXISTS extra_details VARCHAR,
	ADD COLUMN IF NOT EXISTS phone_number VARCHAR;`);
		// Role names are required reference data for registration, independent of optional development fixtures.
		await queryRunner.manager.createQueryBuilder().insert().into('user_roles', ['name'])
			.values(['MANAGER', 'EMPLOYEE', 'CUSTOMER'].map(name => ({ name }))).orIgnore().execute();
		await queryRunner.manager.createQueryBuilder().insert().into('typeorm_metadata', ['type', 'schema', 'name', 'value']).values(INITIAL_VIEWS.map(view => ({
			type: 'VIEW', schema: (queryRunner.connection.options as { schema?: string }).schema || 'public', name: view.name, value: view.expression,
		}))).execute();
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP VIEW IF EXISTS v_predefined_pizza_details, v_catalogue_products');
		await queryRunner.dropTable('predefined_pizza_available_sizes', true, true, true);
		await queryRunner.dropTable('activity_dependencies', true, true, true);
		await queryRunner.dropTable('preparation_activities', true, true, true);
		await queryRunner.dropTable('kitchen_resources', true, true, true);
		await queryRunner.dropTable('pizza_snapshot_allergens', true, true, true);
		await queryRunner.dropTable('pizza_snapshot_components', true, true, true);
		await queryRunner.dropTable('personalized_pizza_snapshots', true, true, true);
		await queryRunner.dropTable('order_items', true, true, true);
		await queryRunner.dropTable('customer_orders', true, true, true);
		await queryRunner.dropTable('stock_movements', true, true, true);
		await queryRunner.dropTable('stock_items', true, true, true);
		await queryRunner.dropTable('predefined_pizza_recipes', true, true, true);
		await queryRunner.dropTable('predefined_pizzas', true, true, true);
		await queryRunner.dropTable('component_size_configurations', true, true, true);
		await queryRunner.dropTable('product_allergens', true, true, true);
		await queryRunner.dropTable('products', true, true, true);
		await queryRunner.dropTable('pizza_component_types', true, true, true);
		await queryRunner.dropTable('pizza_sizes', true, true, true);
		await queryRunner.dropTable('product_categories', true, true, true);
		await queryRunner.dropTable('user_dietary_restrictions', true, true, true);
		await queryRunner.dropTable('customer_addresses', true, true, true);
		await queryRunner.dropTable('customers', true, true, true);
		await queryRunner.dropTable('allergens', true, true, true);
		await queryRunner.dropTable('user_role_assignments', true, true, true);
		await queryRunner.dropTable('user_roles', true, true, true);
		await queryRunner.dropTable('users', true, true, true);
		await queryRunner.query('DROP FUNCTION IF EXISTS enforce_minimum_owned_children()');
		await queryRunner.manager.createQueryBuilder().delete().from('typeorm_metadata')
			.where('"type" = :type AND "schema" = :schema AND "name" IN (:...names)', {
				type: 'VIEW', schema: (queryRunner.connection.options as { schema?: string }).schema || 'public', names: INITIAL_VIEWS.map(view => view.name),
			}).execute();
	}
}
