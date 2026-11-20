import { StockMovementEntity, PredefinedPizzaEntity, PredefinedPizzaRecipeEntity, PredefinedPizzaAvailableSizeEntity } from '../../../src/infrastructure/persistence/entities';
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { createTestDatabase, postgres } from '../../helpers/postgres';
import { PostgresCategoryRepository } from '../../../src/infrastructure/persistence/repositories/PostgresCategoryRepository';
import { PostgresAllergenRepository } from '../../../src/infrastructure/persistence/repositories/PostgresAllergenRepository';
import { PostgresPizzaSizeRepository } from '../../../src/infrastructure/persistence/repositories/PostgresPizzaSizeRepository';
import { PostgresPizzaComponentTypeRepository } from '../../../src/infrastructure/persistence/repositories/PostgresPizzaComponentTypeRepository';
import { PostgresProductRepository } from '../../../src/infrastructure/persistence/repositories/PostgresProductRepository';
import { PostgresComponentSizeConfigurationRepository } from '../../../src/infrastructure/persistence/repositories/PostgresComponentSizeConfigurationRepository';
import { PostgresStockRepository } from '../../../src/infrastructure/persistence/repositories/PostgresStockRepository';
import { PostgresPredefinedPizzaRepository } from '../../../src/infrastructure/persistence/repositories/PostgresPredefinedPizzaRepository';
import { PostgresCatalogueRepository } from '../../../src/infrastructure/persistence/repositories/PostgresCatalogueRepository';
import { ProductCategory } from '../../../src/domain/product/product-category/ProductCategory';
import { CategoryName } from '../../../src/domain/product/product-category/CategoryName';
import { Allergen } from '../../../src/domain/allergen/Allergen';
import { AllergenName } from '../../../src/domain/allergen/AllergenName';
import { PizzaSize } from '../../../src/domain/pizza/PizzaSize';
import { PizzaSizeName } from '../../../src/domain/pizza/PizzaSizeName';
import { PizzaComponentType } from '../../../src/domain/pizza/pizza-component-type/PizzaComponentType';
import { AssemblyOrder, ComponentTypeName } from '../../../src/domain/pizza/pizza-component-type/valueObjects';
import { cardinalityFromStorage } from '../../../src/infrastructure/persistence/mappers/CardinalityMap';
import { Product } from '../../../src/domain/product/Product';
import { ProductName } from '../../../src/domain/product/ProductName';
import { ProductFlags } from '../../../src/domain/product/ProductFlags';
import { Sku } from '../../../src/domain/product/Sku';
import { Money } from '../../../src/domain/common/Money';
import { StockQuantity } from '../../../src/domain/stock/StockQuantity';
import { ComponentSizeConfiguration } from '../../../src/domain/pizza/ComponentSizeConfiguration';
import { ConfigurationId } from '../../../src/domain/pizza/ConfigurationId';
import { PredefinedPizza } from '../../../src/domain/pizza/PredefinedPizza';
import { PredefinedPizzaId } from '../../../src/domain/pizza/PredefinedPizzaId';
import { RecipeLine } from '../../../src/domain/pizza/RecipeLine';

// Explicit opt-in: use an initialized test database. Each test rolls back every write.
postgres('Natural-key repositories against PostgreSQL', () => {
	let dataSource: DataSource, runner: QueryRunner, scoped: DataSource;
	let database: Awaited<ReturnType<typeof createTestDatabase>>;
	let categories: PostgresCategoryRepository, allergens: PostgresAllergenRepository, sizes: PostgresPizzaSizeRepository;
	let types: PostgresPizzaComponentTypeRepository, products: PostgresProductRepository;
	let configurations: PostgresComponentSizeConfigurationRepository, stock: PostgresStockRepository;
	let pizzas: PostgresPredefinedPizzaRepository, catalogue: PostgresCatalogueRepository;
	let category: ProductCategory, allergen: Allergen, size: PizzaSize, type: PizzaComponentType, product: Product;
	let suffix: string;

	beforeAll(async () => { database = await createTestDatabase(); dataSource = database.dataSource; });
	afterAll(async () => { await database?.close(); });
	beforeEach(async () => {
		runner = dataSource.createQueryRunner();
		await runner.startTransaction();
		// Each adapter uses this manager; nested TypeORM transactions become savepoints.
		scoped = {
			manager: runner.manager,
			getRepository: runner.manager.getRepository.bind(runner.manager),
			transaction: async (work: (manager: typeof runner.manager) => Promise<unknown>) => runner.manager.transaction(async manager => {
				const value = await work(manager);
				await manager.query('SET CONSTRAINTS ALL IMMEDIATE');
				await manager.query('SET CONSTRAINTS ALL DEFERRED');
				return value;
			}),
		} as DataSource;
		categories = new PostgresCategoryRepository(scoped);
		allergens = new PostgresAllergenRepository(scoped);
		sizes = new PostgresPizzaSizeRepository(scoped);
		types = new PostgresPizzaComponentTypeRepository(scoped);
		products = new PostgresProductRepository(scoped);
		configurations = new PostgresComponentSizeConfigurationRepository(scoped);
		stock = new PostgresStockRepository(scoped);
		pizzas = new PostgresPredefinedPizzaRepository(scoped);
		catalogue = new PostgresCatalogueRepository(scoped);
		suffix = randomUUID();
		category = ProductCategory.create({ name: CategoryName.create('Category ' + suffix), description: 'PostgreSQL regression' });
		allergen = Allergen.create({ name: AllergenName.create('Allergen ' + suffix), description: 'PostgreSQL regression' });
		size = PizzaSize.create({ name: PizzaSizeName.create('Size ' + suffix), active: true });
		const existing = await types.findAll();
		type = PizzaComponentType.create({ name: ComponentTypeName.create('Type ' + suffix), assemblyOrder: AssemblyOrder.create(Math.max(0, ...existing.map(t => t.assemblyOrder.sequenceNumber)) + 1).getValue(), cardinality: cardinalityFromStorage(0, null) });
		await categories.save(category);
		await allergens.save(allergen);
		await sizes.save(size);
		await types.save(type);
		product = Product.create({ sku: Sku.create('PRODUCT-' + suffix), name: ProductName.create('Product ' + suffix), description: 'PostgreSQL regression', category: category.name, componentType: type.name, flags: new ProductFlags(true, true, true), directSellingPrice: Money.create(4.25, 'USD'), active: true, allergens: new Set() });
		product.addAllergen(allergen.name);
		await products.save(product);
	});
	afterEach(async () => {
		if (runner) {
			await runner.rollbackTransaction();
			await runner.release();
		}
	});

	it('round-trips natural identifiers, currencies, allergens and reference protection', async () => {
		const loaded = (await products.findBySku(product.sku))!;
		expect(loaded.sku.equals(product.sku)).toBe(true);
		expect(loaded.directSellingPrice).not.toBeNull();
		expect(
			loaded.directSellingPrice?.equals(Money.create(4.25, 'USD')),
		).toBe(true);
		expect([...loaded.allergens].map(a => a.value)).toEqual([allergen.name.value]);
		expect((await products.findAll({ categoryName: category.name, componentTypeName: type.name, allergenName: allergen.name }))).toHaveLength(1);
		expect(await categories.isReferencedByProducts(category.name)).toBe(true);
		expect(await allergens.isReferenced(allergen.name)).toBe(true);
		expect(await types.isReferenced(type.name)).toBe(true);
		expect((await types.findByName(type.name))!.cardinality.maximum).toBe(2147483647);
		loaded.deactivate();
		await products.update(loaded);
		expect((await products.findBySku(product.sku))!.active).toBe(false);
		expect(await types.isReferenced(type.name)).toBe(true);
	});

	it('detects configuration usage only when the same pizza uses the component and size', async () => {
		const otherSize = PizzaSize.create({ name: PizzaSizeName.create('Other usage ' + suffix), active: true });
		await sizes.save(otherSize);
		const otherComponent = Product.create({ sku: Sku.create('OTHER-COMP-' + suffix), name: ProductName.create('Other component'), description: '', category: category.name, componentType: type.name, flags: new ProductFlags(false, true, false), active: true, allergens: new Set() });
		await products.save(otherComponent);
		const variants: [Sku, PizzaSizeName][] = [[product.sku, size.name], [product.sku, otherSize.name], [otherComponent.sku, size.name]];
		for (const [componentSku, pizzaSize] of variants) {
			await configurations.save(ComponentSizeConfiguration.create({ id: ConfigurationId.create(randomUUID()), componentSku, pizzaSize, price: Money.create(1), stockUnitsConsumed: StockQuantity.create(1) }));
		}
		expect(await configurations.isUsedByPredefinedPizza(product.sku, size.name)).toBe(false);
		const createPizza = async (label: string, componentSku: Sku, pizzaSize: PizzaSizeName) => {
			const parent = Product.create({ sku: Sku.create(label + suffix), name: ProductName.create(label), description: '', category: category.name, flags: new ProductFlags(true, false, false), directSellingPrice: Money.create(5), active: true, allergens: new Set() });
			await products.save(parent);
			await scoped.getRepository(PredefinedPizzaEntity).save({ sku: parent.sku.value, recipe_name: label });
			await scoped.getRepository(PredefinedPizzaRecipeEntity).save({ pizza_sku: parent.sku.value, component_product_sku: componentSku.value, default_quantity: 1 });
			await scoped.getRepository(PredefinedPizzaAvailableSizeEntity).save({ pizza_sku: parent.sku.value, pizza_size: pizzaSize.value });
			return parent.sku.value;
		};
		const firstPizza = await createPizza('USAGE-A-', product.sku, otherSize.name);
		expect(await configurations.isUsedByPredefinedPizza(product.sku, otherSize.name)).toBe(true);
		expect(await configurations.isUsedByPredefinedPizza(product.sku, size.name)).toBe(false);
		await createPizza('USAGE-B-', otherComponent.sku, size.name);
		// The requested component and size exist, but belong to different pizzas.
		expect(await configurations.isUsedByPredefinedPizza(product.sku, size.name)).toBe(false);
		await scoped.getRepository(PredefinedPizzaAvailableSizeEntity).save({ pizza_sku: firstPizza, pizza_size: size.name.value });
		expect(await configurations.isUsedByPredefinedPizza(product.sku, size.name)).toBe(true);
		expect(await configurations.isUsedByPredefinedPizza(Sku.create('UNKNOWN-' + suffix), size.name)).toBe(false);
	});
	it('round-trips configuration prices and records stock movements through their root', async () => {
		const config = ComponentSizeConfiguration.create({ id: ConfigurationId.create(randomUUID()), componentSku: product.sku, pizzaSize: size.name, price: Money.create(2, 'GBP'), stockUnitsConsumed: StockQuantity.create(2) });
		expect(await configurations.validateReferences(product.sku, size.name)).toBe(true);
		await configurations.save(config);
		expect((await configurations.findById(config.id))!.configuration.price.equals(Money.create(2, 'GBP'))).toBe(true);
		config.changePrice(Money.create(3, 'GBP'));
		await configurations.save(config);
		expect((await configurations.findByProduct(product.sku))[0].configuration.price.amount).toBe(3);
		expect(await sizes.isReferenced(size.name)).toBe(true);
		expect((await stock.withLockedItem(product.sku, item => item.replenish(StockQuantity.create(5), 'Delivery')))!.currentUnits).toBe(5);
		expect((await stock.withLockedItem(product.sku, item => item.consume(StockQuantity.create(2), 'Sale')))!.currentUnits).toBe(3);
		const movements = await runner.manager.getRepository(StockMovementEntity).find({ select: { type: true, amount: true }, where: { product_sku: product.sku.value }, order: { amount: 'DESC' } });
		expect(movements).toEqual([{ type: 'REPLENISHMENT', amount: 5 }, { type: 'CONSUMPTION', amount: 2 }]);
	});

	it('persists a complete recipe and projects its configured price and availability', async () => {
		const recipe = new Set<RecipeLine>();
		// Satisfy the current configured minima without changing the baseline types.
		for (const configured of await types.findAll()) {
			for (let index = 0; index < configured.cardinality.minimum; index++) {
				const component = Product.create({ sku: Sku.create(configured.name.value + index + suffix), name: ProductName.create(configured.name.value + index + suffix), description: '', category: category.name, componentType: configured.name, flags: new ProductFlags(false, true, false), directSellingPrice: Money.create(2), active: true, allergens: new Set() });
				await products.save(component);
				await configurations.save(ComponentSizeConfiguration.create({ id: ConfigurationId.create(randomUUID()), componentSku: component.sku, pizzaSize: size.name, price: Money.create(2), stockUnitsConsumed: StockQuantity.create(0) }));
				recipe.add(new RecipeLine(component.sku, 1));
			}
		}
		await configurations.save(ComponentSizeConfiguration.create({ id: ConfigurationId.create(randomUUID()), componentSku: product.sku, pizzaSize: size.name, price: Money.create(3), stockUnitsConsumed: StockQuantity.create(1) }));
		recipe.add(new RecipeLine(product.sku, 1));
		const parent = Product.create({ sku: Sku.create('PIZZA-' + suffix), name: ProductName.create('Pizza ' + suffix), description: '', category: category.name, flags: new ProductFlags(true, false, false), directSellingPrice: Money.create(5), active: true, allergens: new Set() });
		await products.save(parent);
		const pizza = PredefinedPizza.create({ id: new PredefinedPizzaId(parent.sku, size.name), recipeName: 'Recipe', recipe });
		await pizzas.save([pizza]);
		expect((await pizzas.findById(pizza.id))!.recipe.size).toBe(recipe.size);
		expect((await pizzas.findByProduct(parent.sku))).toHaveLength(1);
		expect((await pizzas.findSupportedSizes(parent.sku)).map(s => s.value)).toEqual([size.name.value]);
		const item = (await catalogue.findByProductSku(parent.sku.value))!;
		expect(item.isPredefinedPizza).toBe(true);
		expect(item.allergens).toContain(allergen.name.value);
		expect(item.sizeVariants![0].computedPrice.amount).toBe(3 + (recipe.size - 1) * 2);
		expect(item.isAvailable).toBe(false);
		await stock.withLockedItem(product.sku, root => root.replenish(StockQuantity.create(1), 'Delivery'));
		expect((await catalogue.findByProductSku(parent.sku.value))!.isAvailable).toBe(true);
		const otherSize = PizzaSize.create({ name: PizzaSizeName.create('Other ' + suffix), active: true });
		await sizes.save(otherSize);
		// A duplicate-pizza request must otherwise be valid before its uniqueness conflict is asserted.
		for (const line of recipe) await configurations.save(ComponentSizeConfiguration.create({
			id: ConfigurationId.create(randomUUID()), componentSku: line.componentSku, pizzaSize: otherSize.name,
			price: Money.create(2), stockUnitsConsumed: StockQuantity.create(0),
		}));
		await expect(pizzas.save([PredefinedPizza.create({ id: new PredefinedPizzaId(parent.sku, otherSize.name), recipeName: 'Other recipe', recipe })])).rejects.toBeInstanceOf(ConflictException);
		expect(await pizzas.findByProduct(parent.sku)).toHaveLength(1);
	});
});
