BEGIN;

CREATE TABLE IF NOT EXISTS component_size_configurations (
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
);

COMMIT;
