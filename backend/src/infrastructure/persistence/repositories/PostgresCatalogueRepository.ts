import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { Money } from '../../../domain/common/Money';
import { ICatalogueRepository } from '../../../application/catalogue/ICatalogueRepository';
import { CatalogueItemDTO } from '../../../application/catalogue/CatalogueDTOs';
import { ProductEntity, PredefinedPizzaDetailsView } from '../entities';

@Injectable()
export class PostgresCatalogueRepository implements ICatalogueRepository {
	constructor(@InjectDataSource() private readonly dataSource: DataSource) {}
	async findAll(): Promise<CatalogueItemDTO[]> { return this.load(); }
	async findByProductSku(sku: string): Promise<CatalogueItemDTO | null> { return (await this.load(sku))[0] ?? null; }
	private async load(sku?: string): Promise<CatalogueItemDTO[]> {
		// Load the complete projection graph in one query, then all price/availability view rows in one batch.
		const query = this.dataSource.getRepository(ProductEntity).createQueryBuilder('product')
			.leftJoinAndSelect('product.allergenAssignments', 'allergens')
			.leftJoinAndSelect('product.stockItem', 'stock')
			.leftJoinAndSelect('product.predefinedPizza', 'pizza')
			.leftJoinAndSelect('pizza.recipe', 'recipe')
			.leftJoinAndSelect('recipe.component', 'component')
			.leftJoinAndSelect('component.allergenAssignments', 'componentAllergens')
			.leftJoinAndSelect('component.configurations', 'configurations')
			.where('product.is_sellable = :sellable AND product.is_active = :active', { sellable: true, active: true })
			.andWhere('(pizza.sku IS NOT NULL OR product.direct_selling_price IS NOT NULL)')
			.orderBy('product.name', 'ASC').addOrderBy('product.sku', 'ASC');
		if (sku !== undefined) query.andWhere('product.sku = :sku', { sku });
		const products = await query.getMany();
		const pizzaSkus = products.filter(product => product.predefinedPizza).map(product => product.sku);
		const details = pizzaSkus.length ? await this.dataSource.getRepository(PredefinedPizzaDetailsView).find({
			where: { pizza_sku: In(pizzaSkus) }, order: { pizza_size: 'ASC' },
		}) : [];
		return products.map(product => {
			const pizza = product.predefinedPizza;
			const allergenNames = new Set(product.allergenAssignments.map(value => value.allergen_name));
			if (pizza) for (const line of pizza.recipe) for (const value of line.component.allergenAssignments) allergenNames.add(value.allergen_name);
			const item: CatalogueItemDTO = {
				productSku: product.sku, name: product.name, description: product.description, categoryName: product.category_name,
				allergens: [...allergenNames].sort(), isPredefinedPizza: !!pizza,
				isAvailable: product.is_stock_controlled ? (product.stockItem?.current_units ?? 0) > 0 : true,
			};
			if (pizza) {
				item.recipeName = pizza.recipe_name;
				item.defaultRecipeLines = [...pizza.recipe].sort((a, b) => a.component_product_sku.localeCompare(b.component_product_sku))
					.map(line => ({ componentSku: line.component_product_sku, defaultQuantity: line.default_quantity }));
				item.sizeVariants = details.filter(row => row.pizza_sku === product.sku && pizza.recipe.every(line =>
					line.component.is_active && line.component.is_pizza_component && line.component.configurations.some(config => config.pizza_size === row.pizza_size)))
					.map(row => ({ pizzaSize: row.pizza_size, sizeName: row.pizza_size,
						computedPrice: { amount: Number(row.calculated_price), currency: row.price_currency }, isAvailable: row.is_available_in_size }));
				item.isAvailable = item.sizeVariants.some(size => size.isAvailable);
			} else if (product.direct_selling_price !== null) {
				const price = Money.create(Number(product.direct_selling_price), product.direct_price_currency ?? undefined);
				item.directPrice = { amount: price.amount, currency: price.currency };
			}
			return item;
		});
	}
}
