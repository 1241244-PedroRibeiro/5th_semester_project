import { DataSource, EntityManager } from 'typeorm';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { PostgresPredefinedPizzaRepository } from '../../../src/infrastructure/persistence/repositories/PostgresPredefinedPizzaRepository';
import { PredefinedPizza } from '../../../src/domain/pizza/PredefinedPizza';
import { PredefinedPizzaId } from '../../../src/domain/pizza/PredefinedPizzaId';
import { PizzaSizeName } from '../../../src/domain/pizza/PizzaSizeName';
import { RecipeLine } from '../../../src/domain/pizza/RecipeLine';
import { Sku } from '../../../src/domain/product/Sku';
import {
	ComponentSizeConfigurationEntity,
	PizzaComponentTypeEntity,
	PizzaSizeEntity,
	PredefinedPizzaEntity,
	PredefinedPizzaAvailableSizeEntity,
	PredefinedPizzaRecipeEntity,
	ProductEntity,
} from '../../../src/infrastructure/persistence/entities';
import { queryBuilder } from '../../helpers/query-builder';

const pizza = (size = 'Large', quantity = 2) =>
	PredefinedPizza.create({
		id: new PredefinedPizzaId(Sku.create('PIZZA'), PizzaSizeName.create(size)),
		recipeName: 'Pizza',
		recipe: new Set([new RecipeLine(Sku.create('CHEESE'), quantity)]),
	});
function setup() {
	const rows = new Map<unknown, unknown[]>([
		[
			PizzaComponentTypeEntity,
			[{ name: 'Cheese', assembly_order: 1, min_cardinality: 0, max_cardinality: null }],
		],
		[
			ProductEntity,
			[
				{ sku: 'PIZZA', is_sellable: true, is_active: true },
				{ sku: 'CHEESE', is_active: true, is_pizza_component: true, component_type_name: 'Cheese' },
			],
		],
		[
			PizzaSizeEntity,
			[
				{ name: 'Large', is_active: true },
				{ name: 'Small', is_active: true },
			],
		],
		[
			ComponentSizeConfigurationEntity,
			[
				{ id: 'config-1', product_sku: 'CHEESE', pizza_size: 'Large' },
				{ id: 'config-2', product_sku: 'CHEESE', pizza_size: 'Small' },
			],
		],
	]);
	const manager = {
		getRepository: (entity: unknown) => ({
			createQueryBuilder: () => {
				const query = queryBuilder();
				query.getMany.mockImplementation(async () => rows.get(entity) ?? []);
				query.getOne.mockImplementation(async () => rows.get(entity)?.[0] ?? null);
				return query;
			},
		}),
		insert: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	};
	const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<void>) =>
		work(manager as unknown as EntityManager),
	);
	return {
		repo: new PostgresPredefinedPizzaRepository({ transaction } as unknown as DataSource),
		manager,
		rows,
		transaction,
	};
}
describe('TypeORM predefined pizza aggregate', () => {
	it('writes one recipe and multiple size associations in one transaction', async () => {
		const { repo, manager, transaction } = setup();
		await repo.save([pizza(), pizza('Small')]);
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(manager.insert).toHaveBeenCalledWith(PredefinedPizzaEntity, {
			sku: 'PIZZA',
			recipe_name: 'Pizza',
		});
		expect(manager.insert).toHaveBeenCalledWith(PredefinedPizzaAvailableSizeEntity, [
			{ pizza_sku: 'PIZZA', pizza_size: 'Large' },
			{ pizza_sku: 'PIZZA', pizza_size: 'Small' },
		]);
		expect(manager.insert).toHaveBeenCalledWith(PredefinedPizzaRecipeEntity, [
			{ pizza_sku: 'PIZZA', component_product_sku: 'CHEESE', default_quantity: 2 },
		]);
	});
	it('rejects inconsistent recipes across sizes before any insert', async () => {
		const { repo, manager } = setup();
		await expect(repo.save([pizza(), pizza('Small', 3)])).rejects.toThrow(
			'All size variants must share',
		);
		expect(manager.insert).not.toHaveBeenCalled();
	});
	it('rejects duplicate size variants before any insert', async () => {
		const { repo, manager } = setup();
		await expect(repo.save([pizza(), pizza()])).rejects.toThrow('Available sizes must be unique');
		expect(manager.insert).not.toHaveBeenCalled();
	});
	it('rejects a missing configuration before persisting the root', async () => {
		const { repo, manager, rows } = setup();
		rows.set(ComponentSizeConfigurationEntity, []);
		await expect(repo.save([pizza()])).rejects.toBeInstanceOf(UnprocessableEntityException);
		expect(manager.insert).not.toHaveBeenCalled();
	});
	it('rejects inactive components', async () => {
		const { repo, rows } = setup();
		rows.set(ProductEntity, [
			{ sku: 'PIZZA', is_sellable: true, is_active: true },
			{ sku: 'CHEESE', is_active: false },
		]);
		await expect(repo.save([pizza()])).rejects.toThrow('An active Pizza Component');
	});
	it('enforces configured type minima', async () => {
		const { repo, rows } = setup();
		rows.set(PizzaComponentTypeEntity, [
			{ name: 'Cheese', assembly_order: 1, min_cardinality: 2, max_cardinality: null },
		]);
		await expect(repo.save([pizza()])).rejects.toThrow(
			'Invalid number of components for type Cheese',
		);
	});
	it('maps concurrent uniqueness conflicts to the existing API error', async () => {
		const { repo, manager } = setup();
		manager.insert.mockRejectedValue({ driverError: { code: '23505' } });
		await expect(repo.save([pizza()])).rejects.toBeInstanceOf(ConflictException);
	});
	it('locks and updates the existing root and replaces children in the same transaction', async () => {
		const { repo, manager, rows, transaction } = setup();
		rows.set(PredefinedPizzaEntity, [{ sku: 'PIZZA', recipe_name: 'Old recipe' }]);
		await repo.save([pizza('Small', 3)], { replace: true });
		expect(transaction).toHaveBeenCalledTimes(1);
		expect(manager.update).toHaveBeenCalledWith(
			PredefinedPizzaEntity,
			{ sku: 'PIZZA' },
			{ recipe_name: 'Pizza' },
		);
		expect(manager.delete).toHaveBeenCalledWith(PredefinedPizzaRecipeEntity, {
			pizza_sku: 'PIZZA',
		});
		expect(manager.delete).toHaveBeenCalledWith(PredefinedPizzaAvailableSizeEntity, {
			pizza_sku: 'PIZZA',
		});
		expect(manager.insert).not.toHaveBeenCalledWith(PredefinedPizzaEntity, expect.anything());
		expect(manager.insert).toHaveBeenCalledWith(PredefinedPizzaRecipeEntity, [
			{ pizza_sku: 'PIZZA', component_product_sku: 'CHEESE', default_quantity: 3 },
		]);
	});
	it('does not replace a recipe whose new size configuration is invalid', async () => {
		const { repo, manager, rows } = setup();
		rows.set(ComponentSizeConfigurationEntity, []);
		await expect(repo.save([pizza()], { replace: true })).rejects.toThrow('configuration');
		expect(manager.update).not.toHaveBeenCalled();
		expect(manager.delete).not.toHaveBeenCalled();
	});
});
