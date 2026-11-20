BEGIN;

CREATE TABLE IF NOT EXISTS product_categories (
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

INSERT INTO pizza_component_types (name, assembly_order, min_cardinality, max_cardinality)
VALUES
	('Base Dough', 1, 1, 1),
	('Base Sauce', 2, 0, 1),
	('Cheese', 3, 0, 1),
	('Topping', 4, 0, NULL)
ON CONFLICT (name) DO NOTHING;

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
);


COMMIT;
