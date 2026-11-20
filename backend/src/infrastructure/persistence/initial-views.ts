/** Frozen SQL baseline shared by the initial migration and explicit adoption of legacy databases. */
export const INITIAL_VIEWS = [
	{ name: 'v_catalogue_products', expression: `SELECT
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
GROUP BY p.sku` },
	{ name: 'v_predefined_pizza_details', expression: `SELECT
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
    AND COUNT(DISTINCT config.price_currency) = 1` }
];
