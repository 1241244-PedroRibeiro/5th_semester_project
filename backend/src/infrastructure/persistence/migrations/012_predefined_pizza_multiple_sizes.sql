
BEGIN;

-- Preserve the size variants before changing the predefined pizza identity.
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
    AND COUNT(DISTINCT config.price_currency) = 1;

COMMIT;
