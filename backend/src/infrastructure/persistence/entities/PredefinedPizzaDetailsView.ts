import { ViewColumn, ViewEntity } from 'typeorm';

// Existing PostgreSQL projection; SQL is required to preserve its aggregate semantics.
@ViewEntity({ name: 'v_predefined_pizza_details', expression: `
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
    AND COUNT(DISTINCT config.price_currency) = 1` })
export class PredefinedPizzaDetailsView {
	@ViewColumn()
	pizza_sku!: string;

	@ViewColumn()
	pizza_name!: string;

	@ViewColumn()
	description!: string;

	@ViewColumn()
	category_name!: string;

	@ViewColumn()
	pizza_size!: string;

	@ViewColumn()
	calculated_price!: string;

	@ViewColumn()
	price_currency!: string;

	@ViewColumn()
	is_available_in_size!: boolean;
}
