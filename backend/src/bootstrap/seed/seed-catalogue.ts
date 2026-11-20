import { Logger } from '@nestjs/common';
import type { ProductResponseDTO } from '../../application/product/ProductDTOs';
import { found, PIZZA_SIZES, unwrap } from './seed-helpers';
import type { SeedServices } from './seed-services';

const logger = new Logger('Seed');

interface ProductFixture {
	sku: string; name: string; description: string; category: string;
	/** Absent for ingredients: their prices come from size configurations. */
	price?: number;
	/** Opening balance for stock-controlled products; absent for pizzas. */
	stock?: number;
	componentType?: string;
	allergens: string[];
}

interface IngredientFixture extends ProductFixture { sizePrices: [number, number, number]; }

const INGREDIENTS: IngredientFixture[] = [
	{ sku: 'PRD-DOUGH', name: 'Classic Pizza Dough', description: 'Slow-fermented wheat pizza dough', category: 'Ingredients', componentType: 'Base Dough', stock: 120, sizePrices: [4, 5, 6], allergens: ['Gluten'] },
	{ sku: 'PRD-TOMATO', name: 'Tomato Sauce', description: 'Tomato sauce with oregano and olive oil', category: 'Ingredients', componentType: 'Base Sauce', stock: 120, sizePrices: [1, 1.25, 1.5], allergens: [] },
	// Mozzarella keeps the original fixture's opening stock of 10.
	{ sku: 'PRD-MOZZ', name: 'Mozzarella', description: 'Mozzarella cheese for pizza', category: 'Ingredients', componentType: 'Cheese', stock: 10, sizePrices: [1.5, 2, 2.5], allergens: ['Lactose'] },
	{ sku: 'PRD-PEPPERONI', name: 'Pepperoni Slices', description: 'Spiced pepperoni topping', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [1.5, 2, 2.5], allergens: [] },
	{ sku: 'PRD-BASIL', name: 'Fresh Basil', description: 'Fresh basil leaves', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [0.5, 0.5, 0.5], allergens: [] },
	{ sku: 'PRD-HAM', name: 'Cooked Ham', description: 'Thinly sliced cooked ham', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [1.5, 2, 2.5], allergens: [] },
	{ sku: 'PRD-MUSHROOM', name: 'Mushrooms', description: 'Sliced button mushrooms', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [1, 1.25, 1.5], allergens: [] },
	{ sku: 'PRD-ONION', name: 'Red Onion', description: 'Thinly sliced red onion rings', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [0.5, 0.75, 1], allergens: [] },
	{ sku: 'PRD-PEPPER', name: 'Green Peppers', description: 'Diced green bell peppers', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [0.5, 0.75, 1], allergens: [] },
	{ sku: 'PRD-OLIVES', name: 'Black Olives', description: 'Pitted sliced black olives', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [0.75, 1, 1.25], allergens: [] },
	{ sku: 'PRD-PINEAPPLE', name: 'Pineapple', description: 'Sweet pineapple chunks', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [1, 1.25, 1.5], allergens: [] },
	{ sku: 'PRD-JALAPENO', name: 'Jalapeno Slices', description: 'Pickled hot jalapeno slices', category: 'Ingredients', componentType: 'Topping', stock: 120, sizePrices: [0.5, 0.75, 1], allergens: [] },
	{ sku: 'PRD-SHRIMP', name: 'Shrimp', description: 'Peeled cooked shrimp', category: 'Ingredients', componentType: 'Topping', stock: 80, sizePrices: [2.5, 3, 3.5], allergens: ['Crustaceans'] },
];

/** Every predefined pizza starts from the same base; toppings complete the recipe. */
const PIZZA_BASE = ['PRD-DOUGH', 'PRD-TOMATO', 'PRD-MOZZ'];

/** A pizza's direct price is its Small recipe price: the sum of each ingredient's Small size price. */
function smallRecipePrice(toppings: string[]): number {
	return [...PIZZA_BASE, ...toppings]
		.map(sku => INGREDIENTS.find(ingredient => ingredient.sku === sku)!.sizePrices[0])
		.reduce((total, price) => total + price, 0);
}

type PizzaFixture = Omit<ProductFixture, 'price' | 'category' | 'allergens'> & { toppings: string[] };
const pizza = (fixture: PizzaFixture): ProductFixture & { toppings: string[] } =>
	({ ...fixture, category: 'Pizzas', price: smallRecipePrice(fixture.toppings), allergens: [] });

// The product domain requires a direct price for every sellable product: pizzas store their Small recipe price.
const PIZZAS = [
	pizza({ sku: 'PIZ-MARGHERITA', name: 'Margherita', description: 'Tomato sauce, mozzarella and fresh basil.', toppings: ['PRD-BASIL'] }),
	pizza({ sku: 'PIZ-PEPPERONI', name: 'Pepperoni', description: 'Tomato sauce, mozzarella and pepperoni.', toppings: ['PRD-PEPPERONI'] }),
	pizza({ sku: 'PIZ-HAWAIIAN', name: 'Hawaiian', description: 'Tomato sauce, mozzarella, cooked ham and pineapple.', toppings: ['PRD-HAM', 'PRD-PINEAPPLE'] }),
	pizza({ sku: 'PIZ-FUNGHI', name: 'Funghi', description: 'Tomato sauce, mozzarella and sliced mushrooms.', toppings: ['PRD-MUSHROOM'] }),
	pizza({ sku: 'PIZ-VEGETARIANA', name: 'Vegetariana', description: 'Tomato sauce, mozzarella, mushrooms, red onion, green peppers and black olives.', toppings: ['PRD-MUSHROOM', 'PRD-ONION', 'PRD-PEPPER', 'PRD-OLIVES'] }),
	pizza({ sku: 'PIZ-DIAVOLA', name: 'Diavola', description: 'Tomato sauce, mozzarella, pepperoni and hot jalapenos.', toppings: ['PRD-PEPPERONI', 'PRD-JALAPENO'] }),
	pizza({ sku: 'PIZ-PROSCIUTTO-FUNGHI', name: 'Prosciutto e Funghi', description: 'Tomato sauce, mozzarella, cooked ham and mushrooms.', toppings: ['PRD-HAM', 'PRD-MUSHROOM'] }),
	pizza({ sku: 'PIZ-FRUTTI-DI-MARE', name: 'Frutti di Mare', description: 'Tomato sauce, mozzarella, shrimp and fresh basil.', toppings: ['PRD-SHRIMP', 'PRD-BASIL'] }),
];

const FIXED_PRODUCTS: ProductFixture[] = [
	{ sku: 'SIDE-GARLIC-KNOTS', name: 'Garlic Knots', description: 'Six oven-baked garlic knots with herb butter.', category: 'Sides', price: 4.5, stock: 40, allergens: ['Gluten', 'Lactose'] },
	{ sku: 'BEV-COLA', name: 'Cola', description: 'Chilled cola, 330 ml.', category: 'Beverages', price: 2.5, stock: 80, allergens: [] },
	{ sku: 'BEV-WATER', name: 'Still Water', description: 'Still mineral water, 500 ml.', category: 'Beverages', price: 1.5, stock: 100, allergens: [] },
	{ sku: 'BEV-ORANGE-JUICE', name: 'Orange Juice', description: 'Orange juice, 250 ml.', category: 'Beverages', price: 3, stock: 60, allergens: [] },
	{ sku: 'SIDE-BRUSCHETTA', name: 'Bruschetta', description: 'Toasted bread with tomato, garlic, basil and olive oil.', category: 'Sides', price: 4, stock: 40, allergens: ['Gluten'] },
	{ sku: 'SIDE-MOZZARELLA-STICKS', name: 'Mozzarella Sticks', description: 'Six breaded mozzarella sticks with tomato dip.', category: 'Sides', price: 5, stock: 40, allergens: ['Gluten', 'Lactose'] },
	{ sku: 'SIDE-CHICKEN-WINGS', name: 'Chicken Wings', description: 'Eight oven-roasted chicken wings with barbecue glaze.', category: 'Sides', price: 6.5, stock: 40, allergens: [] },
	{ sku: 'BEV-LEMONADE', name: 'Lemonade', description: 'Homemade lemonade, 330 ml.', category: 'Beverages', price: 3, stock: 60, allergens: [] },
	{ sku: 'BEV-ICED-TEA', name: 'Iced Tea', description: 'Peach iced tea, 330 ml.', category: 'Beverages', price: 2.5, stock: 80, allergens: [] },
	{ sku: 'BEV-SPARKLING-WATER', name: 'Sparkling Water', description: 'Sparkling mineral water, 500 ml.', category: 'Beverages', price: 2, stock: 100, allergens: [] },
	{ sku: 'DES-TIRAMISU', name: 'Tiramisu', description: 'Classic mascarpone and espresso tiramisu.', category: 'Desserts', price: 4.5, stock: 30, allergens: ['Gluten', 'Lactose'] },
	{ sku: 'DES-CHOCOLATE-LAVA-CAKE', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a molten centre.', category: 'Desserts', price: 5, stock: 30, allergens: ['Gluten', 'Lactose'] },
];

/** Development catalogue only. Runs after the baseline taxonomy exists. */
export async function seedCatalogue(services: SeedServices): Promise<void> {
	const products = await seedProducts(services);
	await seedProductAllergens(services, products);
	await seedSizeConfigurations(services, products);
	await seedPredefinedPizzas(services, products);
}

/** Creates missing products and their opening stock. Returns every fixture product that exists afterwards. */
async function seedProducts({ products, stock }: SeedServices): Promise<Map<string, ProductResponseDTO>> {
	const available = new Map<string, ProductResponseDTO>();
	for (const fixture of [...INGREDIENTS, ...PIZZAS, ...FIXED_PRODUCTS]) {
		const existing = await products.getProductBySku(fixture.sku);
		if (existing.isSuccess) {
			available.set(fixture.sku, existing.getValue());
			continue;
		}
		const created = await products.createProduct({
			sku: fixture.sku, name: fixture.name, description: fixture.description, categoryName: fixture.category,
			isSellable: fixture.price !== undefined, isPizzaComponent: fixture.componentType !== undefined,
			isStockControlled: fixture.stock !== undefined, componentTypeName: fixture.componentType,
			directSellingPrice: fixture.price ?? null,
		});
		if (created.isFailure) {
			// E.g. the name already belongs to another SKU: skip it, and everything that depends on it.
			logger.warn(`Skipping product ${fixture.sku}: ${created.getError()}`);
			continue;
		}
		available.set(fixture.sku, created.getValue());
		// Opening balances only accompany a newly created product, so existing stock is never reset.
		if (fixture.stock)
			unwrap(`Opening stock for ${fixture.sku}`, await stock.adjustStock(fixture.sku, {
				adjustmentType: 'INCREASE', amount: fixture.stock, reason: 'Opening balance (development seed)',
			}));
	}
	return available;
}

/** Baseline allergen associations are ensured on every run. */
async function seedProductAllergens({ products }: SeedServices, available: Map<string, ProductResponseDTO>): Promise<void> {
	for (const fixture of [...INGREDIENTS, ...FIXED_PRODUCTS]) {
		const product = available.get(fixture.sku);
		if (!product) continue;
		for (const allergen of fixture.allergens)
			if (!product.associatedAllergens.includes(allergen))
				unwrap(`Allergen ${allergen} on ${fixture.sku}`, await products.associateAllergen(fixture.sku, allergen));
	}
}

async function seedSizeConfigurations({ configurations }: SeedServices, available: Map<string, ProductResponseDTO>): Promise<void> {
	for (const ingredient of INGREDIENTS) {
		if (!available.has(ingredient.sku)) continue;
		for (const [index, pizzaSize] of PIZZA_SIZES.entries()) {
			if ((await configurations.getAll(undefined, ingredient.sku, pizzaSize)).length) continue;
			await configurations.create({
				componentSku: ingredient.sku, pizzaSize, price: ingredient.sizePrices[index], stockUnitsConsumed: index + 1,
			});
		}
	}
}

/** Recipes and sizes belong to the manager after creation: an existing pizza is never restored or changed. */
async function seedPredefinedPizzas({ pizzas }: SeedServices, available: Map<string, ProductResponseDTO>): Promise<void> {
	for (const pizza of PIZZAS) {
		const recipe = [...PIZZA_BASE, ...pizza.toppings];
		if (!available.get(pizza.sku)?.isSellable || !recipe.every(sku => available.has(sku))) continue;
		if (await found(() => pizzas.findById(pizza.sku))) continue;
		await pizzas.create({
			pizzaSku: pizza.sku,
			recipeName: `${pizza.name} house recipe`,
			defaultRecipeLines: recipe.map(componentSku => ({ componentSku, defaultQuantity: 1 })),
			availableSizes: PIZZA_SIZES,
		});
	}
}
