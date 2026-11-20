BEGIN;

CREATE TABLE IF NOT EXISTS customer_orders (
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
);

COMMIT;
