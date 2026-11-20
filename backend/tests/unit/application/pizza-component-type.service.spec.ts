import { DataSource } from 'typeorm';
import { mockDataSource } from '../../helpers/mock-data-source';
process.env.USE_IN_MEMORY_REPO = 'true';
import { BadRequestException } from '@nestjs/common';
import { PizzaComponentTypeConflictError, PizzaComponentTypeNotFoundError } from '../../../src/domain/pizza/pizza-component-type/PizzaComponentTypeErrors';
import { DomainError } from '../../../src/domain/common/DomainError';
import { Test } from '@nestjs/testing';
import { PizzaComponentTypeModule } from '../../../src/presentation/pizza-component-type.module';
import { PizzaComponentTypeService } from '../../../src/application/pizza/PizzaComponentTypeService';
import { PIZZA_COMPONENT_TYPE_REPOSITORY } from '../../../src/domain/pizza/pizza-component-type/PizzaComponentTypeRepository';
import { InMemoryPizzaComponentTypeRepository } from '../../../src/infrastructure/persistence/repositories/InMemoryPizzaComponentTypeRepository';
import { PostgresPizzaComponentTypeRepository } from '../../../src/infrastructure/persistence/repositories/PostgresPizzaComponentTypeRepository';
describe('PizzaComponentType service and wiring', () => {
	it('resolves the configured repository and maps nullable maxima', async () => { const module = await Test.createTestingModule({ imports: [PizzaComponentTypeModule] }).overrideProvider(DataSource).useValue(mockDataSource).compile(); try { const service = module.get(PizzaComponentTypeService); expect(module.get(PIZZA_COMPONENT_TYPE_REPOSITORY)).toBeInstanceOf(InMemoryPizzaComponentTypeRepository); const result = await service.createComponentType({ name: 'Olive', assemblyOrder: 20, minCardinality: 0, maxCardinality: null }); expect(result).toEqual({ name: 'Olive', assemblyOrder: 20, minCardinality: 0, maxCardinality: null }); expect((await service.findByName((await import('../../../src/domain/pizza/pizza-component-type/valueObjects')).ComponentTypeName.create('Olive')))!.cardinality.isSatisfiedBy(1000)).toBe(true); expect(await service.updateComponentType('Olive', result)).toEqual(result); } finally { await module.close(); } });
	it('selects PostgreSQL without executing database queries', async () => { const previous = process.env.USE_IN_MEMORY_REPO; delete process.env.USE_IN_MEMORY_REPO; const module = await Test.createTestingModule({ imports: [PizzaComponentTypeModule] }).overrideProvider(DataSource).useValue(mockDataSource).compile(); try { expect(module.get(PIZZA_COMPONENT_TYPE_REPOSITORY)).toBeInstanceOf(PostgresPizzaComponentTypeRepository); } finally { process.env.USE_IN_MEMORY_REPO = previous; await module.close(); } });
});


describe('Component type updates', () => {
	let service: PizzaComponentTypeService;
	const initial = { name: 'Olive', assemblyOrder: 20, minCardinality: 0, maxCardinality: 3 };
	beforeEach(async () => {
		service = new PizzaComponentTypeService(new InMemoryPizzaComponentTypeRepository());
		await service.createComponentType(initial);
		await service.createComponentType({ ...initial, name: 'Other', assemblyOrder: 21 });
	});
	it('persists new cardinalities and an available assembly order under the original name', async () => {
		const expected = { ...initial, assemblyOrder: 22, minCardinality: 1, maxCardinality: 5 };
		expect(await service.updateComponentType('Olive', expected)).toEqual(expected);
		expect(await service.getComponentTypeByName('Olive')).toEqual(expected);
	});
	it('updates either bound independently, preserves omitted fields and supports an unbounded maximum', async () => {
		expect(await service.updateComponentType('Olive', { minCardinality: 2 })).toEqual({ ...initial, minCardinality: 2 });
		expect(await service.updateComponentType('Olive', { maxCardinality: null })).toEqual({ ...initial, minCardinality: 2, maxCardinality: null });
		expect(await service.updateComponentType('Olive', { minCardinality: 4 })).toEqual({ ...initial, minCardinality: 4, maxCardinality: null });
		expect(await service.updateComponentType('Olive', { maxCardinality: 6 })).toEqual({ ...initial, minCardinality: 4, maxCardinality: 6 });
	});
	it('allows retaining the same name and assembly order', async () => {
		expect(await service.updateComponentType('Olive', initial)).toEqual(initial);
	});
	it('rejects renames without modifying either record', async () => {
		await expect(service.updateComponentType('Olive', { name: 'Other' })).rejects.toBeInstanceOf(BadRequestException);
		expect(await service.getComponentTypeByName('Olive')).toEqual(initial);
		expect(await service.getComponentTypeByName('Other')).toEqual({ ...initial, name: 'Other', assemblyOrder: 21 });
	});
	it('rejects an occupied order without persisting cardinality changes', async () => {
		await expect(service.updateComponentType('Olive', { assemblyOrder: 21, minCardinality: 1 })).rejects.toBeInstanceOf(PizzaComponentTypeConflictError);
		expect(await service.getComponentTypeByName('Olive')).toEqual(initial);
	});
	it.each([{ minCardinality: -1 }, { minCardinality: 4 }, { maxCardinality: -1 }, { minCardinality: 2, maxCardinality: 1 }])('rejects invalid bounds %j without changing the order', async dto => {
		await expect(service.updateComponentType('Olive', { ...dto, assemblyOrder: 22 })).rejects.toBeInstanceOf(DomainError);
		expect(await service.getComponentTypeByName('Olive')).toEqual(initial);
	});
	it.each([0, -1, 1.5, '22', null])('rejects invalid order %s', async assemblyOrder => {
		await expect(service.updateComponentType('Olive', { assemblyOrder } as any)).rejects.toBeInstanceOf(BadRequestException);
		expect(await service.getComponentTypeByName('Olive')).toEqual(initial);
	});
	it('reports missing types', async () => {
		await expect(service.updateComponentType('Missing', { minCardinality: 1 })).rejects.toBeInstanceOf(PizzaComponentTypeNotFoundError);
	});
	it.each([null, [], 'invalid'])('rejects a non-object body %j', async dto => {
		await expect(service.updateComponentType('Olive', dto as any)).rejects.toBeInstanceOf(BadRequestException);
	});
});
