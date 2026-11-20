import { Product } from '../../../domain/product/Product';
import { Sku } from '../../../domain/product/Sku';
import { ProductName } from '../../../domain/product/ProductName';
import { ProductFlags } from '../../../domain/product/ProductFlags';
import { CategoryName } from '../../../domain/product/product-category/CategoryName';
import { ComponentTypeName } from '../../../domain/pizza/pizza-component-type/valueObjects';
import { AllergenName } from '../../../domain/allergen/AllergenName';
import { Money } from '../../../domain/common/Money';

export interface ProductPersistenceRow {
	sku: string;
	name: string;
	description: string;
	category_name: string;
	is_sellable: boolean;
	is_pizza_component: boolean;
	is_stock_controlled: boolean;
	component_type_name: string | null;
	direct_selling_price: string | number | null;
	direct_price_currency?: string | null;
	stock_units_per_sale: number | null;
	is_active: boolean;
	allergens?: string[];
}

export class ProductMap {
	static toDomain(row: ProductPersistenceRow): Product {
		return Product.create({
			sku: Sku.create(row.sku),
			name: ProductName.create(row.name),
			description: row.description,
			category: CategoryName.create(row.category_name),
			flags: new ProductFlags(
				row.is_sellable,
				row.is_pizza_component,
				row.is_stock_controlled
			),
			componentType: row.component_type_name
				? ComponentTypeName.create(row.component_type_name)
				: undefined,
			directSellingPrice:
				row.direct_selling_price === null
					? null
					: Money.create(
						Number(row.direct_selling_price),
						row.direct_price_currency ?? undefined
					),
			stockUnitsPerSale: row.stock_units_per_sale,
			active: row.is_active,
			allergens: new Set(
				(row.allergens ?? []).map(
					name => AllergenName.create(name)
				)
			)
		});
	}
}