import { DataSource } from 'typeorm';
import { PostgresCatalogueRepository } from '../../../src/infrastructure/persistence/repositories/PostgresCatalogueRepository';
import { ProductEntity } from '../../../src/infrastructure/persistence/entities';
import { queryBuilder } from '../../helpers/query-builder';

function setup(predefined = false) {
	const query = queryBuilder();
	const product = { sku: 'PIZZA', name: 'Pizza', description: 'Description', category_name: 'Pizzas',
		direct_selling_price: '5.25', direct_price_currency: 'USD', is_stock_controlled: false, stockItem: null,
		allergenAssignments: [{ allergen_name: 'Gluten' }], predefinedPizza: predefined ? { recipe_name: 'Recipe', recipe: [
			{ component_product_sku: 'CHEESE', default_quantity: 2, component: { is_active: true, is_pizza_component: true,
				allergenAssignments: [{ allergen_name: 'Lactose' }], configurations: [{ pizza_size: 'Large' }] } },
		] } : null };
	query.getMany.mockResolvedValue([product]);
	const find = jest.fn().mockResolvedValue([{ pizza_sku: 'PIZZA', pizza_size: 'Large', calculated_price: '3.50', price_currency: 'EUR', is_available_in_size: false }]);
	const source = { getRepository: (entity: unknown) => entity === ProductEntity ? { createQueryBuilder: () => query } : { find } } as unknown as DataSource;
	return { repo: new PostgresCatalogueRepository(source), query, product, find };
}
describe('TypeORM catalogue projections', () => {
	it('preserves the standard product response and its stored currency', async () => {
		const { repo, find } = setup();
		expect(await repo.findByProductSku('PIZZA')).toEqual({ productSku: 'PIZZA', name: 'Pizza', description: 'Description', categoryName: 'Pizzas',
			allergens: ['Gluten'], isPredefinedPizza: false, isAvailable: true, directPrice: { amount: 5.25, currency: 'USD' } });
		expect(find).not.toHaveBeenCalled();
	});
	it('combines component allergens, recipe quantities, computed prices and stock availability', async () => {
		const { repo } = setup(true);
		expect(await repo.findByProductSku('PIZZA')).toMatchObject({ allergens: ['Gluten', 'Lactose'], isPredefinedPizza: true, isAvailable: false,
			defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 2 }],
			sizeVariants: [{ pizzaSize: 'Large', sizeName: 'Large', computedPrice: { amount: 3.5, currency: 'EUR' }, isAvailable: false }] });
	});
	it('removes sizes whose component became inactive', async () => {
		const { repo, product } = setup(true); product.predefinedPizza!.recipe[0].component.is_active = false;
		expect((await repo.findByProductSku('PIZZA'))!.sizeVariants).toEqual([]);
	});
	it('returns null when no public catalogue product matches', async () => {
		const { repo, query } = setup(); query.getMany.mockResolvedValue([]);
		expect(await repo.findByProductSku('MISSING')).toBeNull();
	});
});
