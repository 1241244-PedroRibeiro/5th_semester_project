import { ViewColumn, ViewEntity } from 'typeorm';

// Existing PostgreSQL projection; SQL is required to preserve its aggregate semantics.
@ViewEntity({ name: 'v_catalogue_products', expression: `
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
GROUP BY p.sku` })
export class CatalogueProductsView {
	@ViewColumn()
	sku!: string;

	@ViewColumn()
	name!: string;

	@ViewColumn()
	description!: string;

	@ViewColumn()
	category_name!: string;

	@ViewColumn()
	direct_selling_price!: string | null;

	@ViewColumn()
	direct_price_currency!: string | null;

	@ViewColumn()
	is_sellable!: boolean;

	@ViewColumn()
	is_pizza_component!: boolean;

	@ViewColumn()
	is_active!: boolean;

	@ViewColumn()
	allergens!: { name: string }[];
}
