import { NotFoundException } from '@nestjs/common';
import { CatalogueService } from '../../../../src/application/catalogue/CatalogueService';
import { ICatalogueRepository } from '../../../../src/application/catalogue/ICatalogueRepository';
import {
	CatalogueItemDTO,
} from '../../../../src/application/catalogue/CatalogueDTOs';

const catalogueItems: CatalogueItemDTO[] = [
	{
		productSku: 'PRD-COLA',
		name: 'Cola',
		description: 'Cold beverage',
		categoryName: 'CAT-BEV',
		allergens: [],
		directPrice: { amount: 2.5, currency: 'EUR' },
		isPredefinedPizza: false,
		isAvailable: false,
	},
	{
		productSku: 'PRD-WATER',
		name: 'Water',
		description: 'Bottled water',
		categoryName: 'CAT-BEV',
		allergens: [],
		directPrice: { amount: 1, currency: 'EUR' },
		isPredefinedPizza: false,
		isAvailable: true,
	},
	{
		productSku: 'PRD-PIZZA-MARG',
		name: 'Pizza Margherita',
		description: 'Tomato and mozzarella',
		categoryName: 'CAT-PIZZA',
		allergens: ['ALL-GLUTEN', 'ALL-DAIRY'],
		isPredefinedPizza: true,
		isAvailable: false,
		recipeName: 'Margherita',
		defaultRecipeLines: [
			{ componentSku: 'PRD-MOZZ', defaultQuantity: 1 },
		],
		sizeVariants: [
			{
				pizzaSize: '550e8400-e29b-41d4-a716-446655440001',
				sizeName: 'Small',
				computedPrice: { amount: 7, currency: 'EUR' },
				isAvailable: false,
			},
			{
				pizzaSize: '550e8400-e29b-41d4-a716-446655440002',
				sizeName: 'Medium',
				computedPrice: { amount: 9, currency: 'EUR' },
				isAvailable: true,
			},
		],
	},
	{
		productSku: 'PRD-PIZZA-SOLDOUT',
		name: 'Unavailable Pizza',
		description: 'Currently unavailable',
		categoryName: 'CAT-PIZZA',
		allergens: [],
		isPredefinedPizza: true,
		isAvailable: true,
		recipeName: 'Unavailable',
		defaultRecipeLines: [],
		sizeVariants: [
			{
				pizzaSize: '550e8400-e29b-41d4-a716-446655440003',
				sizeName: 'Small',
				computedPrice: { amount: 8, currency: 'EUR' },
				isAvailable: false,
			},
		],
	},
];

function setup() {
	const repository: jest.Mocked<ICatalogueRepository> = {
		findAll: jest.fn().mockResolvedValue(catalogueItems),
		findByProductSku: jest.fn().mockImplementation(
			async (code: string) =>
				catalogueItems.find(
					(item) =>
						item.productSku.toUpperCase() === code.toUpperCase(),
				) ?? null,
		),
	};

	return {
		service: new CatalogueService(repository),
		repository,
	};
}

describe('CatalogueService', () => {
	it('returns catalogue products', async () => {
		const ctx = setup();

		const result = await ctx.service.getCatalogue();

		expect(result).toHaveLength(4);
		expect(ctx.repository.findAll).toHaveBeenCalledTimes(1);
	});

	it('filters by category without case sensitivity', async () => {
		const ctx = setup();

		const result = await ctx.service.getCatalogue({
			categoryName: ' cat-pizza ',
		});

		expect(result.map((item) => item.productSku)).toEqual([
			'PRD-PIZZA-MARG',
			'PRD-PIZZA-SOLDOUT',
		]);
	});

	it('excludes products containing the specified allergens', async () => {
		const ctx = setup();

		const result = await ctx.service.getCatalogue({
			excludeAllergens: ['all-dairy'],
		});

		expect(result.map((item) => item.productSku)).toEqual([
			'PRD-COLA',
			'PRD-WATER',
			'PRD-PIZZA-SOLDOUT',
		]);
	});

	it('returns only currently available products when requested', async () => {
		const ctx = setup();

		const result = await ctx.service.getCatalogue({
			availableOnly: true,
		});

		expect(result.map((item) => item.productSku)).toEqual([
			'PRD-WATER',
			'PRD-PIZZA-MARG',
		]);
	});

	it('derives predefined pizza availability from its size variants', async () => {
		const ctx = setup();

		const result = await ctx.service.getCatalogue();

		const margherita = result.find(
			(item) => item.productSku === 'PRD-PIZZA-MARG',
		);
		const soldOut = result.find(
			(item) => item.productSku === 'PRD-PIZZA-SOLDOUT',
		);

		expect(margherita?.isAvailable).toBe(true);
		expect(soldOut?.isAvailable).toBe(false);
	});

	it('returns the details of a product by code', async () => {
		const ctx = setup();

		const result = await ctx.service.getCatalogueItemByCode(
			'PRD-PIZZA-MARG',
		);

		expect(result.name).toBe('Pizza Margherita');
		expect(result.recipeName).toBe('Margherita');
		expect(result.sizeVariants).toHaveLength(2);
	});

	it('throws NotFoundException when a product does not exist', async () => {
		const ctx = setup();

		ctx.repository.findByProductSku.mockResolvedValueOnce(null);

		await expect(
			ctx.service.getCatalogueItemByCode('PRD-UNKNOWN'),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
