import { DataSource } from 'typeorm';
import { createTestDatabase, postgres, seedTestDatabase } from '../helpers/postgres';
import { PostgresCatalogueRepository } from '../../src/infrastructure/persistence/repositories/PostgresCatalogueRepository';
import {
	ComponentSizeConfigurationEntity, PredefinedPizzaAvailableSizeEntity, PredefinedPizzaRecipeEntity,
	ProductEntity, StockItemEntity,
} from '../../src/infrastructure/persistence/entities';

postgres('Development catalogue seeds', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let source: DataSource;
	beforeAll(async () => { database = await createTestDatabase(); source = database.dataSource; });
	afterAll(async () => { await database?.close(); });

	it('exposes sellable beverages, a side and fully configured pizzas in the real catalogue', async () => {
		const catalogue = await new PostgresCatalogueRepository(source).findAll();
		// 8 pizzas, 4 sides, 6 beverages and 2 desserts (migrations may add their own test products).
		expect(catalogue.filter(item => /^(PIZ|SIDE|BEV|DES)-/.test(item.productSku))).toHaveLength(20);
		expect(catalogue.find(item => item.productSku === 'DES-TIRAMISU')).toMatchObject({
			categoryName: 'Desserts', isAvailable: true, allergens: ['Gluten', 'Lactose'],
			directPrice: { amount: 4.5, currency: 'EUR' },
		});
		const hawaiian = catalogue.find(item => item.productSku === 'PIZ-HAWAIIAN')!;
		expect(hawaiian.defaultRecipeLines).toHaveLength(5);
		expect(hawaiian.sizeVariants).toHaveLength(3);
		expect(hawaiian.sizeVariants!.find(variant => variant.pizzaSize === 'Small')).toMatchObject({
			isAvailable: true, computedPrice: { amount: 9, currency: 'EUR' },
		});
		expect(catalogue.find(item => item.productSku === 'PIZ-FRUTTI-DI-MARE')!.allergens).toEqual(
			expect.arrayContaining(['Gluten', 'Lactose', 'Crustaceans']),
		);
		for (const [sku, price] of [['BEV-COLA', 2.5], ['BEV-WATER', 1.5], ['BEV-ORANGE-JUICE', 3]] as const) {
			expect(catalogue.find(item => item.productSku === sku)).toMatchObject({
				categoryName: 'Beverages', isPredefinedPizza: false, isAvailable: true,
				directPrice: { amount: price, currency: 'EUR' },
			});
		}
		expect(catalogue.find(item => item.productSku === 'SIDE-GARLIC-KNOTS')).toMatchObject({
			categoryName: 'Sides', isAvailable: true, allergens: ['Gluten', 'Lactose'],
		});
		for (const [sku, prices] of [['PIZ-MARGHERITA', [7, 8.75, 10.5]], ['PIZ-PEPPERONI', [8, 10.25, 12.5]]] as const) {
			const pizza = catalogue.find(item => item.productSku === sku)!;
			expect(pizza).toMatchObject({ isAvailable: true, isPredefinedPizza: true, allergens: ['Gluten', 'Lactose'] });
			expect(pizza.defaultRecipeLines).toHaveLength(4);
			for (const [index, size] of ['Small', 'Medium', 'Large'].entries()) {
				expect(pizza.sizeVariants!.find(variant => variant.pizzaSize === size)).toMatchObject({
					isAvailable: true, computedPrice: { amount: prices[index], currency: 'EUR' },
				});
			}
		}
	});

	it('can run repeatedly without duplicating products or resetting staff changes', async () => {
		const before = await source.getRepository(ProductEntity).count();
		await source.getRepository(ProductEntity).update({ sku: 'BEV-COLA' }, { name: 'House Cola', direct_selling_price: '2.75' });
		await source.getRepository(StockItemEntity).update({ product_sku: 'BEV-COLA' }, { current_units: 3 });
		await source.getRepository(ComponentSizeConfigurationEntity).update({ product_sku: 'PRD-DOUGH', pizza_size: 'Small' }, { price: '4.25' });
		await source.getRepository(PredefinedPizzaRecipeEntity).delete({ pizza_sku: 'PIZ-MARGHERITA', component_product_sku: 'PRD-BASIL' });
		await source.getRepository(PredefinedPizzaAvailableSizeEntity).delete({ pizza_sku: 'PIZ-MARGHERITA', pizza_size: 'Large' });
		await seedTestDatabase(source);
		await seedTestDatabase(source);
		expect(await source.getRepository(ProductEntity).count()).toBe(before);
		expect(await source.getRepository(ProductEntity).findOneByOrFail({ sku: 'BEV-COLA' })).toMatchObject({ name: 'House Cola', direct_selling_price: '2.75' });
		expect(await source.getRepository(StockItemEntity).findOneByOrFail({ product_sku: 'BEV-COLA' })).toMatchObject({ current_units: 3 });
		expect(Number((await source.getRepository(ComponentSizeConfigurationEntity).findOneByOrFail({ product_sku: 'PRD-DOUGH', pizza_size: 'Small' })).price)).toBe(4.25);
		expect(await source.getRepository(PredefinedPizzaRecipeEntity).countBy({ pizza_sku: 'PIZ-MARGHERITA' })).toBe(3);
		expect(await source.getRepository(PredefinedPizzaAvailableSizeEntity).countBy({ pizza_sku: 'PIZ-MARGHERITA' })).toBe(2);
	});
});
