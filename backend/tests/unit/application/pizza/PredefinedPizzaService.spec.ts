import { PizzaSizeName } from '../../../../src/domain/pizza/PizzaSizeName';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PredefinedPizzaService } from '../../../../src/application/pizza/PredefinedPizzaService';
import { IPredefinedPizzaRepository } from '../../../../src/application/pizza/IPredefinedPizzaRepository';
import { InMemoryProductRepository } from '../../../../src/infrastructure/persistence/repositories/InMemoryProductRepository';
import { InMemoryPizzaComponentTypeRepository } from '../../../../src/infrastructure/persistence/repositories/InMemoryPizzaComponentTypeRepository';
import { ProductFlags } from '../../../../src/domain/product/ProductFlags';
import { Sku } from '../../../../src/domain/product/Sku';
import { productFixture, typeFixture } from '../../../helpers/domain';
describe('Predefined pizza per-size orchestration', () => {
	let service: PredefinedPizzaService,
		repo: jest.Mocked<IPredefinedPizzaRepository>,
		products: InMemoryProductRepository;
	const dto = {
		pizzaSku: 'PIZZA',
		recipeName: 'Pizza',
		defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 2 }],
		availableSizes: ['Large', 'Small'],
	};
	beforeEach(async () => {
		products = new InMemoryProductRepository();
		await products.save(productFixture());
		await products.save(
			productFixture({
				sku: Sku.create('PIZZA'),
				flags: new ProductFlags(true, false, false),
				componentType: undefined,
			}),
		);
		const types = new InMemoryPizzaComponentTypeRepository();
		await types.save(typeFixture());
		repo = {
			findSupportedSizesForProducts: jest.fn().mockResolvedValue(new Map()),
			findSupportedSizes: jest
				.fn()
				.mockResolvedValue([PizzaSizeName.create('Large'), PizzaSizeName.create('Small')]),
			save: jest.fn(),
			findAll: jest.fn().mockResolvedValue([]),
			findById: jest.fn().mockResolvedValue(null),
			findByProduct: jest.fn().mockResolvedValue([]),
		};
		service = new PredefinedPizzaService(repo, products, types);
	});
	it('creates one aggregate per selected size in one repository transaction', async () => {
		const result = await service.create(dto);
		expect(repo.save).toHaveBeenCalledTimes(1);
		const pizzas = repo.save.mock.calls[0][0];
		expect(pizzas.map((pizza) => pizza.id.pizzaSize.value)).toEqual(['Large', 'Small']);
		expect([...pizzas[0].recipe][0].componentSku).toBeInstanceOf(Sku);
		expect(result.ids).toEqual([
			{ pizzaSku: 'PIZZA', pizzaSize: 'Large' },
			{ pizzaSku: 'PIZZA', pizzaSize: 'Small' },
		]);
	});
	it('rejects missing products before persistence', async () => {
		await expect(service.create({ ...dto, pizzaSku: 'MISSING' })).rejects.toBeInstanceOf(
			NotFoundException,
		);
		expect(repo.save).not.toHaveBeenCalled();
	});
	it('rejects inactive components before persistence', async () => {
		await products.save(productFixture({ active: false }));
		await expect(service.create(dto)).rejects.toBeInstanceOf(UnprocessableEntityException);
		expect(repo.save).not.toHaveBeenCalled();
	});
	it('rejects empty recipes, invalid quantities, duplicate components and duplicate sizes', async () => {
		for (const input of [
			{ ...dto, defaultRecipeLines: [] },
			{ ...dto, availableSizes: ['Large', 'Large'] },
			{ ...dto, defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 0 }] },
			{ ...dto, defaultRecipeLines: [...dto.defaultRecipeLines, ...dto.defaultRecipeLines] },
		])
			await expect(service.create(input)).rejects.toThrow();
		expect(repo.save).not.toHaveBeenCalled();
	});
	it('looks up a composite identity on the existing detail endpoint', async () => {
		await expect(service.findById('PIZZA', 'Large')).rejects.toBeInstanceOf(NotFoundException);
		expect(repo.findById.mock.calls[0][0].pizzaSku.value).toBe('PIZZA');
		expect(repo.findById.mock.calls[0][0].pizzaSize.value).toBe('Large');
	});
	it('does not advertise a size that is no longer active or fully configured', async () => {
		repo.findSupportedSizes.mockResolvedValue([PizzaSizeName.create('Small')]);
		const result = await service.create(dto);
		expect(result.ids).toHaveLength(2);
		expect(result.supportedSizes).toEqual(['Small']);
	});

	it('batches supported-size reads while preserving one response per size variant', async () => {
		await service.create(dto);
		repo.findAll.mockResolvedValue(repo.save.mock.calls[0][0]);
		repo.findSupportedSizesForProducts.mockResolvedValue(
			new Map([['PIZZA', [PizzaSizeName.create('Large'), PizzaSizeName.create('Small')]]]),
		);
		repo.findSupportedSizes.mockClear();
		const result = await service.findAll();
		expect(result).toHaveLength(2);
		expect(result.map((pizza) => pizza.supportedSizes)).toEqual([['Large'], ['Small']]);
		expect(repo.findSupportedSizesForProducts).toHaveBeenCalledTimes(1);
		expect(repo.findSupportedSizes).not.toHaveBeenCalled();
	});

	it('replaces the shared recipe and all sizes after validating the new configuration', async () => {
		await service.create(dto);
		repo.findByProduct.mockResolvedValue(repo.save.mock.calls[0][0]);
		repo.save.mockClear();
		const result = await service.update('PIZZA', {
			...dto,
			recipeName: 'Updated pizza',
			defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 3 }],
			availableSizes: ['Small'],
		});
		expect(repo.save).toHaveBeenCalledTimes(1);
		expect(repo.save.mock.calls[0][1]).toEqual({ replace: true });
		expect(result.ids).toEqual([{ pizzaSku: 'PIZZA', pizzaSize: 'Small' }]);
		expect(result.recipeName).toBe('Updated pizza');
		expect(result.defaultRecipeLines[0].defaultQuantity).toBe(3);
	});

	it('does not create a missing recipe through update', async () => {
		await expect(service.update('PIZZA', dto)).rejects.toBeInstanceOf(NotFoundException);
		expect(repo.save).not.toHaveBeenCalled();
	});

	it('rejects invalid replacement recipes without persisting changes', async () => {
		await service.create(dto);
		repo.findByProduct.mockResolvedValue(repo.save.mock.calls[0][0]);
		repo.save.mockClear();
		await expect(
			service.update('PIZZA', {
				...dto,
				defaultRecipeLines: [{ componentSku: 'CHEESE', defaultQuantity: 0 }],
			}),
		).rejects.toThrow();
		await expect(
			service.update('PIZZA', { ...dto, defaultRecipeLines: [null as never] }),
		).rejects.toThrow('componentSku');
		expect(repo.save).not.toHaveBeenCalled();
	});
});
